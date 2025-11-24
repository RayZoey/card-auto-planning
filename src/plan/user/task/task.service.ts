/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-11-13 22:09:37
 * @FilePath: /card-backend/src/card/pdf-print-info/pdf-print-info.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {BaseService} from '@src/base/base.service';
import {QueryFilter} from '@src/common/query-filter';
import {QueryConditionParser} from '@src/common/query-condition-parser';
import { PlanStatus, TaskStatus, TaskTimingType } from '@prisma/client';
import { UserTaskCreateDto } from './task.create.dto';
import { UserTaskUpdateDto } from './task.update.dto';
const moment = require('moment');

@Injectable()
export class UserTaskService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly baseService: BaseService,
    private readonly queryConditionParser: QueryConditionParser
  ) {}


  async findById(id: number) {
    const task = await this.prismaService.userTask.findUnique({
      where: {
        id: id
      },
      include: {
        group: true
      }
    });
    if (!task) throw new Error('任务不存在');

    const now = moment();
    const lastHb = task.last_heartbeat_at ? moment(task.last_heartbeat_at) : null;

    // 异常退出标识：PAUSE 且 ≥ 120 s 无心跳
    task['last_off_line'] = (task.status === TaskStatus.PAUSE && lastHb !== null && now.diff(lastHb, 'seconds') >= 90);
    return task;
  }

  async create(userId: number, dto: UserTaskCreateDto, needAutoPlan: boolean, needAutoFill: boolean) {
    
    await this.prismaService.$transaction(async (tx) => {
      const task = await tx.userTask.create({
        data: {
          user: { connect: { id: userId } },
          plan: { connect: { id: dto.plan_id } },
          name: dto.name,
          status: dto.status,
          group: dto.task_group_id ? { connect: { id: dto.task_group_id } } : undefined,
          background: dto.background,
          suggested_time_start: dto.suggested_time_start,
          suggested_time_end: dto.suggested_time_end,
          remark: dto.remark,
          annex_type: dto.annex_type,
          annex: dto.annex,
          timing_type: dto.timing_type,
          occupation_time: dto.occupation_time,
        }
      });
      
      const scheduler = await tx.userTaskScheduler.create({
        data: {
          plan: { connect: { id: dto.plan_id } },
          task: { connect: { id: task.id } },
          priority: dto.UserTaskScheduler.priority,
          global_sort: dto.UserTaskScheduler.global_sort,
          group_sort: dto.UserTaskScheduler.group_sort,
          day_sort: dto.UserTaskScheduler.day_sort,
          date_no: dto.UserTaskScheduler.date_no || 1,
          can_divisible: dto.can_divisible,
        }
      });

      // 如果不需要自动规划或者不需要填充时间，只调整当天其他任务的 day_sort
      if (!needAutoPlan || !needAutoFill) {
        // 调整当天其他任务的 day_sort（day_sort >= 新任务 day_sort 的任务需要 +1）
        await tx.userTaskScheduler.updateMany({
          where: {
            plan_id: dto.plan_id,
            date_no: scheduler.date_no,
            day_sort: { gte: scheduler.day_sort },
            task_id: { not: task.id },
          },
          data: {
            day_sort: { increment: 1 },
          },
        });
        return;
      }

      // 如果需要自动规划并且需要填充时间，先调整当天其他任务的 day_sort（把今日剩余任务向后推后）
      // 调整当天其他任务的 day_sort（day_sort >= 新任务 day_sort 的任务需要 +1）
      await tx.userTaskScheduler.updateMany({
        where: {
          plan_id: dto.plan_id,
          date_no: scheduler.date_no,
          day_sort: { gte: scheduler.day_sort },
          task_id: { not: task.id },
        },
        data: {
          day_sort: { increment: 1 },
        },
      });

      // 然后检查当日时间限制
      const plan = await tx.userPlan.findUnique({
        where: { id: dto.plan_id },
      });
      if (!plan) {
        throw new Error('计划不存在');
      }

      const dayLimit = this.resolvePlanDayLimit(plan.limit_hour, scheduler.date_no);
      if (dayLimit === null) {
        // 没有时间限制，已经调整完 day_sort，直接返回
        return;
      }

      // 插入任务后，检查并处理超时（递归处理被影响的天）
      await this.handleDayOverflow(tx, {
        planId: dto.plan_id,
        dayNo: scheduler.date_no,
        plan: plan,
      });
    });
  }

  async update(id: number, dto: UserTaskUpdateDto, userId: number) {
    const task = await this.prismaService.userTask.findFirst({
      where: {
        id: id,
      }
    });
    if (task.user_id !== userId) {
      throw new Error('未找到该任务信息/该任务不属于当前请求用户');
    }
    return this.prismaService.userTask.update({
      data: dto,
      where: {
        id: id,
      },
    });
  }

  //  用户删除单个任务
  async delete(userId: number, taskId: number, needAutoPlan: boolean, needAutoFill: boolean) {
    const scheduler = await this.prismaService.userTaskScheduler.findUnique({
      where: { task_id: taskId },
      include: {
        task: true,
      },
    });
    if (!scheduler) {
      throw new Error('任务不存在');
    }
    if (scheduler.task.user_id !== userId) {
      throw new Error('未找到该任务信息/该任务不属于当前请求用户');
    }

    await this.prismaService.$transaction(async (tx) => {
      const schedulerForTx = await tx.userTaskScheduler.findUnique({
        where: { task_id: taskId },
        include: { task: true },
      });
      if (!schedulerForTx) {
        throw new Error('任务不存在');
      }
      if (needAutoPlan) {
        console.log(1)
        await this.handleAutoPlanDeletion(tx, schedulerForTx, needAutoFill);
      } else {
        await this.moveTaskDecrement(tx, schedulerForTx);
        await tx.userTaskScheduler.delete({
          where: { task_id: taskId },
        });
      }

      await tx.userTask.delete({
        where: { id: taskId },
      });
    });
    return await this.prismaService.userPlan.findUnique({
        where: {
          id: 5
        },
        include: {
          UserTask: {
            include: {
              UserTaskScheduler: true
            }
          }
        }
      })
  }

  //  删除任务后向前移动所有位置顺
  async moveTaskDecrement(prismaService, task: {task_id: number, plan_id: number, global_sort: number, group_sort:number, day_sort: number, date_no: number}){
      //  移动任务流位置
      if (task.group_sort !== null) {
        await prismaService.userTaskScheduler.updateMany({
          where: {
            plan_id: task.plan_id,
            group_sort: { gt: task.group_sort }
          },
          data: {
            group_sort: { decrement: 1 }  // 获取同一个group中，group_sort大于被删任务的所有任务，顺序向前移动一位
          }
        });
      }
      //  移动当天顺序位置
      await prismaService.userTaskScheduler.updateMany({
        where: {
          plan_id: task.plan_id,
          date_no: task.date_no,
          day_sort: { gt: task.day_sort }
        },
        data: {
          day_sort: { decrement: 1 } // 获取同一个day中，day_sort大于被删任务的所有任务，顺序向前移动一位
        }
      });
      //  移动计划全局位置
      await prismaService.userTaskScheduler.updateMany({
        where: {
          plan_id: task.plan_id,
          global_sort: { gt: task.global_sort }
        },
        data: {
          global_sort: { decrement: 1 } // 获取同一个plan中，global_sort大于被删任务的所有任务，顺序向前移动一位
        }
      });
  }
  
  //  用户学习过程-修改单个任务状态
  async changeTaskStatus(taskId: number, status: TaskStatus, userId: number) {
    return await this.prismaService.$transaction(async tx => {
      const task = await tx.userTask.findFirst({
        where: { id: taskId, user_id: userId },
      });
      if (!task) throw new Error('任务不存在或无权限');
      if (task.status in [TaskStatus.COMPLETE, TaskStatus.SKIP]) {
        throw new Error('任务已结束，不可再变更');
      }

      const valid: Record<TaskStatus, TaskStatus[]> = {
        [TaskStatus.WAITING]: [TaskStatus.PROGRESS, TaskStatus.SKIP],
        [TaskStatus.PROGRESS]: [TaskStatus.PAUSE, TaskStatus.COMPLETE],
        [TaskStatus.PAUSE]: [TaskStatus.PROGRESS, TaskStatus.COMPLETE],
        [TaskStatus.COMPLETE]: [],
        [TaskStatus.SKIP]: [],
      };
      if (!valid[task.status].includes(status)) {
        throw new Error(`非法状态转换 ${task.status} -> ${status}`);
      }

      const now = new Date();
      const upd: any = { status };

      /* 1. 首次开始 */
      if (task.status === TaskStatus.WAITING && status === TaskStatus.PROGRESS) {
        upd.actual_time_start = task.actual_time_start ?? now;
        upd.segment_start     = now;
        upd.last_heartbeat_at = now;
      }

      /* 2. 暂停：累加当前段（分钟） */
      if (task.status === TaskStatus.PROGRESS && status === TaskStatus.PAUSE) {
        const min = Math.floor(moment(now).diff(moment(task.segment_start), 'seconds') / 60);
        upd.actual_time = (task.actual_time || 0) + Math.max(0, min);
      }

      /* 3. 恢复 */
      if (task.status === TaskStatus.PAUSE && status === TaskStatus.PROGRESS) {
        upd.segment_start     = now;
        upd.last_heartbeat_at = now;
      }

      /* 4. 完成：双路径补算 */
      if (status === TaskStatus.COMPLETE) {
        let total = task.actual_time || 0;
        /* 情况 A：在线完成 → 算当前段 */
        if (task.status === TaskStatus.PROGRESS) {
          const min = Math.floor(moment(now).diff(moment(task.segment_start), 'minutes'));
          total += Math.max(0, min);
        }
        /* 情况 B：离线后从 PAUSE 点【结束】→ 用 last_heartbeat 补算最后段 */
        if (task.status === TaskStatus.PAUSE && task.last_heartbeat_at && task.segment_start) {
          const min = Math.floor(moment(task.last_heartbeat_at).diff(moment(task.segment_start), 'minutes'));
          total += Math.max(0, min);
        }
        upd.actual_time     = total;
        upd.actual_time_end = now;
      }

      /* 5. 跳过 */
      if (status === TaskStatus.SKIP) {
        upd.actual_time_end = now;
      }
      
      await tx.userTask.update({ where: { id: taskId }, data: upd });
      await tx.userTaskScheduler.update({ where: { task_id: taskId }, data: {
        status: status
      } });

      /* 6. 日志 */
      await tx.userTaskLog.create({
        data: {
          user_task_id: taskId,
          from_status : task.status,
          to_status   : status,
          created_at  : now,
        },
      });
    });
  }

  /* 学习心跳接口 */
  async heartbeat(taskId: number, userId: number) {
    const res = await this.prismaService.userTask.updateMany({
      where: {
        id: taskId,
        user_id: userId,
        status: TaskStatus.PROGRESS,
      },
      data: { last_heartbeat_at: new Date() },
    });
    if (res.count === 0) throw new Error('任务不存在或已结束');
    return { ok: true };
  }

  private resolvePlanDayLimit(limitHour: any, dayNo: number): number | null {
    if (!limitHour) return null;
    let parsed = limitHour;
    if (typeof limitHour === 'string') {
      try {
        parsed = JSON.parse(limitHour);
      } catch (e) {
        return null;
      }
    }
    if (Array.isArray(parsed)) {
      const val = parsed[dayNo - 1];
      return typeof val === 'number' ? val : null;
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const key = dayNo.toString();
      const val = parsed[key] ?? parsed[dayNo];
      return typeof val === 'number' ? val : null;
    }
    if (typeof parsed === 'number' && dayNo === 1) {
      return parsed;
    }
    return null;
  }

  private async handleAutoPlanDeletion(prismaService, scheduler, needAutoFill: boolean) {
    const plan = await prismaService.userPlan.findUnique({
      where: { id: scheduler.plan_id },
    });
    if (!plan) {
      throw new Error('计划不存在');
    }

    // 保存被删除任务的信息
    const deletedTaskMinutes = scheduler.task?.occupation_time || 0;
    const deletedTaskGroupId = scheduler.task?.task_group_id ?? null;
    const deletedGroupSort = scheduler.group_sort;

    await prismaService.userTaskScheduler.delete({
      where: { task_id: scheduler.task_id },
    });

    // 先把今日剩余任务向前提
    await this.compactDay(prismaService, scheduler.plan_id, scheduler.date_no, scheduler.day_sort);

    if (!needAutoFill) {
      await this.rebuildPlanOrders(prismaService, scheduler.plan_id);
      return;
    }

    const dayLimit = this.resolvePlanDayLimit(plan.limit_hour, scheduler.date_no);
    if (dayLimit === null) {
      await this.rebuildPlanOrders(prismaService, scheduler.plan_id);
      return;
    }

    const dayTasks = await prismaService.userTaskScheduler.findMany({
      where: { plan_id: scheduler.plan_id, date_no: scheduler.date_no },
      include: { task: true },
      orderBy: { day_sort: 'asc' },
    });
    const occupiedMinutes = dayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
    const minutesNeeded = Math.max(dayLimit - occupiedMinutes, 0);

    const originalDayTaskIds = dayTasks.map(item => item.task_id);
    
    if (minutesNeeded > 0 && deletedTaskMinutes > 0) {
      await this.fillDayGap(prismaService, {
        planId: scheduler.plan_id,
        targetDayNo: scheduler.date_no,
        minutesNeeded: deletedTaskMinutes, // 使用被删除任务的时间
        deletedTaskGroupId,
        deletedGroupSort,
        originalDayTaskIds,
      });
    }

    await this.rebuildPlanOrders(prismaService, scheduler.plan_id, scheduler.date_no, originalDayTaskIds);
  }

  private async fillDayGap(prismaService, params: {
    planId: number;
    targetDayNo: number;
    minutesNeeded: number;
    deletedTaskGroupId: number | null;
    deletedGroupSort: number | null;
    originalDayTaskIds: number[];
  }) {
    const { planId, targetDayNo } = params;
    let remaining = params.minutesNeeded;
    if (remaining <= 0) return;

    const plan = await prismaService.userPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) return;

    const excludedTaskIds = new Set<number>();
    let nextDaySort = await prismaService.userTaskScheduler.count({
      where: { plan_id: planId, date_no: targetDayNo },
    }) + 1;

    while (remaining > 0) {
      let candidate = null;

      // 如果被删除的任务是任务集任务，则从同一任务集中找下一个任务
      // 注意：排除目标天的任务，因为这些任务已经在补全过程中被移过来了
      if (params.deletedTaskGroupId !== null && params.deletedGroupSort !== null) {
        candidate = await this.findNextTaskInGroup(prismaService, {
          planId,
          taskGroupId: params.deletedTaskGroupId,
          groupSort: params.deletedGroupSort,
          excludedTaskIds,
          targetDayNo: targetDayNo, // 排除目标天的任务
        });
      }

      // 如果不是任务集任务，或者任务集中找不到，则从次日的任务中选择优先度最高的任务
      if (!candidate) {
        candidate = await this.findBestCandidateFromNextDay(prismaService, {
          planId,
          targetDayNo,
          excludedTaskIds,
        });
      }

      // 如果仍然找不到候选任务，说明没有更多任务可以移动，退出循环
      if (!candidate) break;

      const duration = candidate.task?.occupation_time || 0;
      if (duration <= 0) {
        excludedTaskIds.add(candidate.task_id);
        continue;
      }

      // 记录被移动任务的原所在天和信息
      const movedFromDayNo = candidate.date_no;
      const movedTaskGroupId = candidate.task?.task_group_id ?? null;
      const movedGroupSort = candidate.group_sort;

      // 如果被删除的任务时间 < 挪过来的任务时间，需要切割
      if (duration > remaining) {
        const canSplit = candidate.can_divisible || candidate.task?.can_divisible;
        if (!canSplit) {
          excludedTaskIds.add(candidate.task_id);
          continue;
        }

        const newTaskId = await this.splitTaskForFill(
          prismaService,
          candidate,
          remaining,
          targetDayNo,
          nextDaySort,
        );
        if (!newTaskId) break;

        remaining = 0;
        nextDaySort += 1;
        break;
      }

      // 如果被删除的任务时间 >= 挪过来的任务时间，直接移动
      await this.moveSchedulerTask(prismaService, candidate, targetDayNo, nextDaySort);
      remaining -= duration;
      nextDaySort += 1;

      // 如果被删除的任务是任务集任务，更新group_sort游标
      if (params.deletedTaskGroupId !== null && candidate.task?.task_group_id === params.deletedTaskGroupId && candidate.group_sort !== null) {
        params.deletedGroupSort = candidate.group_sort;
      }

      // 如果任务是从其他天移过来的，需要递归补全原所在天
      // 关键：每移动一个任务后，立即完成该任务的所有连续操作（包括递归补全），
      // 这样就不会出现当某个日期被移动了多次以后，第二次开始不再补全的问题
      if (movedFromDayNo !== targetDayNo && movedFromDayNo > targetDayNo) {
        // 立即递归补全原所在天，确保完全补全后再继续
        // 注意：递归补全时，使用被移动任务的信息（如果是任务集任务，则从同一任务集找下一个；否则从次日选择）
        await this.recursivelyFillDayGap(prismaService, {
          planId,
          targetDayNo: movedFromDayNo,
          minutesNeeded: duration, // 使用被移动任务的时间（但recursivelyFillDayGap会重新计算实际需要的分钟数）
          deletedTaskGroupId: movedTaskGroupId, // 使用被移动任务的任务集ID
          deletedGroupSort: movedGroupSort, // 使用被移动任务的group_sort
          plan,
        });
      }
      
      // 继续循环，检查是否还需要补全
      // 注意：remaining可能已经为0，但循环会继续检查是否有新的候选任务
    }
  }

  // 递归补全某一天，确保完全补全后再返回
  private async recursivelyFillDayGap(prismaService, params: {
    planId: number;
    targetDayNo: number;
    minutesNeeded: number;
    deletedTaskGroupId: number | null;
    deletedGroupSort: number | null;
    plan: any;
  }) {
    const { planId, targetDayNo, minutesNeeded, deletedTaskGroupId, deletedGroupSort, plan } = params;
    
    const dayLimit = this.resolvePlanDayLimit(plan.limit_hour, targetDayNo);
    if (dayLimit === null) return;
    
    // 查询当前天的任务
    const dayTasks = await prismaService.userTaskScheduler.findMany({
      where: { plan_id: planId, date_no: targetDayNo },
      include: { task: true },
      orderBy: { day_sort: 'asc' },
    });
    
    const dayOccupied = dayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
    const dayNeeded = Math.max(dayLimit - dayOccupied, 0);
    
    if (dayNeeded <= 0) return; // 已经满了，不需要补全
    
    const originalDayTaskIds = dayTasks.map(item => item.task_id);
    
    // 使用fillDayGap进行补全
    await this.fillDayGap(prismaService, {
      planId,
      targetDayNo,
      minutesNeeded: dayNeeded, // 使用实际需要的分钟数
      deletedTaskGroupId,
      deletedGroupSort,
      originalDayTaskIds,
    });
  }

  private async splitTaskForFill(prismaService, candidate, minutesToMove: number, targetDayNo: number, daySort: number): Promise<number | null> {
    const task = candidate.task;
    if (!task || minutesToMove <= 0) return null;

    const total = task.occupation_time;
    const remain = total - minutesToMove;
    if (remain <= 0) {
      await prismaService.userTaskScheduler.update({
        where: { task_id: candidate.task_id },
        data: { date_no: targetDayNo, day_sort: daySort },
      });
      return candidate.task_id;
    }

    const baseName = this.normalizeTaskName(task.name || '');
    const fillName = `${baseName}(${minutesToMove}/${total})`;
    const remainName = `${baseName}(${remain}/${total})`;

    const newTask = await prismaService.userTask.create({
      data: {
        plan_id: task.plan_id,
        name: fillName,
        task_group_id: task.task_group_id,
        user_id: task.user_id,
        background: task.background,
        suggested_time_start: task.suggested_time_start,
        suggested_time_end: task.suggested_time_end,
        remark: task.remark,
        annex_type: task.annex_type,
        annex: task.annex,
        timing_type: task.timing_type,
        occupation_time: minutesToMove,
        status: task.status,
        can_divisible: task.can_divisible,
      },
    });

    await prismaService.userTaskScheduler.create({
      data: {
        plan_id: candidate.plan_id,
        task_id: newTask.id,
        priority: candidate.priority,
        global_sort: candidate.global_sort,
        group_sort: candidate.group_sort,
        day_sort: daySort,
        can_divisible: candidate.can_divisible,
        date_no: targetDayNo,
        status: candidate.status,
      },
    });

    await prismaService.userTask.update({
      where: { id: task.id },
      data: {
        occupation_time: remain,
        name: remainName,
      },
    });

    return newTask.id;
  }

  private normalizeTaskName(name: string): string {
    return name.replace(/\(\d+\/\d+\)\s*$/, '').trim();
  }

  private async compactDay(prismaService, planId: number, dayNo: number, deletedSort: number) {
    await prismaService.userTaskScheduler.updateMany({
      where: {
        plan_id: planId,
        date_no: dayNo,
        day_sort: { gt: deletedSort },
      },
      data: {
        day_sort: { decrement: 1 },
      },
    });
  }

  private async moveSchedulerTask(prismaService, schedulerTask, targetDayNo: number, daySort: number) {
    await prismaService.userTaskScheduler.updateMany({
      where: {
        plan_id: schedulerTask.plan_id,
        date_no: schedulerTask.date_no,
        day_sort: { gt: schedulerTask.day_sort },
      },
      data: {
        day_sort: { decrement: 1 },
      },
    });

    await prismaService.userTaskScheduler.update({
      where: { task_id: schedulerTask.task_id },
      data: {
        date_no: targetDayNo,
        day_sort: daySort,
      },
    });
  }

  // 从同一任务集中找下一个任务（group_sort更大的）
  // 注意：只查找不在目标天的任务，因为目标天的任务已经在补全过程中被移过来了
  private async findNextTaskInGroup(prismaService, params: {
    planId: number;
    taskGroupId: number;
    groupSort: number;
    excludedTaskIds: Set<number>;
    targetDayNo?: number; // 添加目标天参数，排除目标天的任务
  }) {
    const where: any = {
      plan_id: params.planId,
      task_id: { notIn: Array.from(params.excludedTaskIds) },
      task: { task_group_id: params.taskGroupId },
      group_sort: { gt: params.groupSort },
    };
    
    // 如果指定了目标天，排除目标天的任务（因为这些任务已经在补全过程中被移过来了）
    if (params.targetDayNo !== undefined) {
      where.date_no = { not: params.targetDayNo };
    }
    
    return prismaService.userTaskScheduler.findFirst({
      where,
      include: { task: true },
      orderBy: { group_sort: 'asc' },
    });
  }

  // 从次日的任务中选择优先度最高的任务（同等优先级下选择id更小的）
  private async findBestCandidateFromNextDay(prismaService, params: {
    planId: number;
    targetDayNo: number;
    excludedTaskIds: Set<number>;
  }) {
    return prismaService.userTaskScheduler.findFirst({
      where: {
        plan_id: params.planId,
        task_id: { notIn: Array.from(params.excludedTaskIds) },
        date_no: { gt: params.targetDayNo },
      },
      include: { task: true },
      orderBy: [
        { date_no: 'asc' },
        { priority: 'asc' },
        { task_id: 'asc' },
        { day_sort: 'asc' },
      ],
    });
  }

  // 处理某一天的超时问题，递归处理被影响的下一天
  private async handleDayOverflow(prismaService, params: {
    planId: number;
    dayNo: number;
    plan: any;
  }) {
    const { planId, dayNo, plan } = params;
    
    // 检查当天的时间限制
    const dayLimit = this.resolvePlanDayLimit(plan.limit_hour, dayNo);
    
    // 如果当天是计划的最后一天，不需要处理时间限制
    const isLastDay = plan.total_days && dayNo >= plan.total_days;
    if (dayLimit === null || isLastDay) {
      // 没有时间限制，不需要处理，但需要检查下一天是否受影响
      const nextDayNo = dayNo + 1;
      const nextDayLimit = this.resolvePlanDayLimit(plan.limit_hour, nextDayNo);
      if (nextDayLimit !== null) {
        const nextDayTasks = await prismaService.userTaskScheduler.findMany({
          where: { plan_id: planId, date_no: nextDayNo },
          include: { task: true },
          orderBy: { day_sort: 'asc' },
        });
        const nextDayOccupied = nextDayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
        const nextDayExcess = nextDayOccupied - nextDayLimit;
        if (nextDayExcess > 0) {
          // 下一天也超时了，递归处理
          await this.handleDayOverflow(prismaService, {
            planId,
            dayNo: nextDayNo,
            plan,
          });
        }
      }
      return;
    }

    // 使用 while 循环处理当天的超时问题
    while (true) {
      // 重新读取当天所有任务（因为任务可能已经被移动或拆分）
      const dayTasks = await prismaService.userTaskScheduler.findMany({
        where: { plan_id: planId, date_no: dayNo },
        include: { task: true },
        orderBy: { day_sort: 'asc' },
      });
      
      // 计算当天已占用时间
      const occupiedMinutes = dayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
      const excessMinutes = occupiedMinutes - dayLimit;

      // 如果不超过时间限制，检查下一天是否受影响
      if (excessMinutes <= 0) {
        // 检查下一天是否超时（因为可能有任务被移到了下一天）
        const nextDayNo = dayNo + 1;
        const nextDayLimit = this.resolvePlanDayLimit(plan.limit_hour, nextDayNo);
        if (nextDayLimit !== null) {
          const nextDayTasks = await prismaService.userTaskScheduler.findMany({
            where: { plan_id: planId, date_no: nextDayNo },
            include: { task: true },
            orderBy: { day_sort: 'asc' },
          });
          const nextDayOccupied = nextDayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
          const nextDayExcess = nextDayOccupied - nextDayLimit;
          if (nextDayExcess > 0) {
            // 下一天也超时了，递归处理
            await this.handleDayOverflow(prismaService, {
              planId,
              dayNo: nextDayNo,
              plan,
            });
          }
        }
        return;
      }

      // 如果超时，需要挪走任务
      // 先检查下一天是否有时间限制，或者是否是最后一天
      const nextDayNo = dayNo + 1;
      const nextDayLimit = this.resolvePlanDayLimit(plan.limit_hour, nextDayNo);
      const isNextDayLastDay = plan.total_days && nextDayNo >= plan.total_days;
      
      // 如果下一天没有时间限制或者是最后一天，把所有超时的任务都移到下一天，不再拆分
      // 注意：如果是最后一天，即使有时间限制，也应该忽略，把所有任务都放在最后一天
      if (nextDayLimit === null || isNextDayLastDay) {
        // 循环移动任务，直到当天不超时
        while (true) {
          // 重新读取当天所有任务
          const currentDayTasks = await prismaService.userTaskScheduler.findMany({
            where: { plan_id: planId, date_no: dayNo },
            include: { task: true },
            orderBy: { day_sort: 'asc' },
          });
          
          const currentOccupied = currentDayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
          const currentExcess = currentOccupied - dayLimit;
          
          if (currentExcess <= 0) {
            // 已经不需要挪走更多任务了
            return;
          }
          
          // 从最低优先级开始逐层查找，相同优先级按 day_sort 倒序（靠后的先被挪走）
          const priorityOrder = [9999, 3, 2, 1]; // 无优先级(9999)、3级、2级、1级
          
          let foundTask = false;
          for (const priority of priorityOrder) {
            // 获取当前优先级的所有任务，按 day_sort 倒序排列（靠后的先被挪走）
            const tasksWithPriority = currentDayTasks
              .filter(item => item.priority === priority)
              .sort((a, b) => b.day_sort - a.day_sort); // 倒序，day_sort 大的在前（靠后的先被挪走）
            
            for (const schedulerTask of tasksWithPriority) {
              const taskDuration = schedulerTask.task?.occupation_time || 0;
              if (taskDuration <= 0) {
                continue;
              }

              // 如果需要移走的时间小于任务时间，且任务可以拆分，则拆分任务
              if (taskDuration > currentExcess) {
                const canSplit = schedulerTask.can_divisible || schedulerTask.task?.can_divisible;
                if (canSplit) {
                  // 拆分任务：将 currentExcess 移到下一天
                  await this.splitTaskForPostpone(
                    prismaService,
                    schedulerTask,
                    currentExcess,
                    dayNo,
                  );
                  foundTask = true;
                  break; // 跳出内层循环，重新检查
                }
              }

              // 如果任务时间 <= 需要挪走的时间，或者不能拆分，直接移动整个任务到次日最顶端
              await this.moveTaskToNextDayTop(prismaService, schedulerTask, dayNo);
              foundTask = true;
              break; // 跳出内层循环，重新检查
            }
            
            if (foundTask) {
              break; // 跳出外层循环，重新检查
            }
          }
          
          if (!foundTask) {
            // 没有找到可以移动的任务，退出循环
            return;
          }
        }
      }
      
      // 如果下一天有时间限制，按照原来的逻辑处理（可以拆分）
      // 从最低优先级开始逐层查找，相同优先级按 day_sort 倒序（靠后的先被挪走）
      const priorityOrder = [9999, 3, 2, 1]; // 无优先级(9999)、3级、2级、1级
      
      let foundTask = false;
      
      for (const priority of priorityOrder) {
        // 获取当前优先级的所有任务，按 day_sort 倒序排列
        const tasksWithPriority = dayTasks
          .filter(item => item.priority === priority)
          .sort((a, b) => b.day_sort - a.day_sort); // 倒序，day_sort 大的在前
        
        for (const schedulerTask of tasksWithPriority) {
          const taskDuration = schedulerTask.task?.occupation_time || 0;
          if (taskDuration <= 0) {
            continue;
          }

          // 如果需要挪走的时间小于任务时间，需要拆分任务
          if (taskDuration > excessMinutes) {
            const canSplit = schedulerTask.can_divisible || schedulerTask.task?.can_divisible;
            if (!canSplit) {
              // 不能拆分，跳过这个任务
              continue;
            }

            // 拆分任务：将 excessMinutes 移到下一天
            await this.splitTaskForPostpone(
              prismaService,
              schedulerTask,
              excessMinutes,
              dayNo,
            );
            foundTask = true;
            break; // 跳出内层循环，重新检查
          } else {
            // 如果任务时间 <= 需要挪走的时间，直接移动整个任务到次日最顶端
            await this.moveTaskToNextDayTop(prismaService, schedulerTask, dayNo);
            foundTask = true;
            break; // 跳出内层循环，重新检查
          }
        }
        
        if (foundTask) {
          break; // 跳出外层循环，重新检查
        }
      }
      
      // 如果没有找到可以挪走的任务，退出循环
      if (!foundTask) {
        // 检查下一天是否受影响
        const nextDayNo = dayNo + 1;
        const nextDayLimit = this.resolvePlanDayLimit(plan.limit_hour, nextDayNo);
        if (nextDayLimit !== null) {
          const nextDayTasks = await prismaService.userTaskScheduler.findMany({
            where: { plan_id: planId, date_no: nextDayNo },
            include: { task: true },
            orderBy: { day_sort: 'asc' },
          });
          const nextDayOccupied = nextDayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
          const nextDayExcess = nextDayOccupied - nextDayLimit;
          if (nextDayExcess > 0) {
            // 下一天也超时了，递归处理
            await this.handleDayOverflow(prismaService, {
              planId,
              dayNo: nextDayNo,
              plan,
            });
          }
        }
        return;
      }
    }
  }

  // 推迟任务到次日，以满足当日时间限制（保留旧方法以兼容，但不再使用）
  private async postponeTasksToNextDay(prismaService, params: {
    planId: number;
    currentDayNo: number;
    minutesToPostpone: number;
    excludeTaskId?: number; // 排除的任务ID（通常是新插入的任务）
    plan?: any; // 计划对象，用于重新计算时间限制
  }) {
    const { planId, currentDayNo, minutesToPostpone, excludeTaskId, plan } = params;
    let remaining = minutesToPostpone;
    if (remaining <= 0) return;

    const excludedTaskIds = new Set<number>();
    if (excludeTaskId) {
      excludedTaskIds.add(excludeTaskId);
    }

    // 如果传入了 plan，需要重新计算时间限制
    let dayLimit: number | null = null;
    if (plan) {
      dayLimit = this.resolvePlanDayLimit(plan.limit_hour, currentDayNo);
    }

    while (remaining > 0) {
      // 按照优先级顺序查找：无优先级(9999)、3级优先级、2级优先级、1级优先级
      // 同一优先级按 day_sort 倒序选择（最靠后的先被挪走）
      const candidate = await this.findTaskToPostpone(prismaService, {
        planId,
        currentDayNo,
        excludedTaskIds,
      });

      if (!candidate) {
        // 没有更多任务可以推迟，检查是否可以拆分新插入的任务
        if (excludeTaskId && remaining > 0) {
          const newTaskScheduler = await prismaService.userTaskScheduler.findUnique({
            where: { task_id: excludeTaskId },
            include: { task: true },
          });
          
          if (newTaskScheduler && 
              newTaskScheduler.priority === 9999 && // 无优先级
              newTaskScheduler.date_no === currentDayNo &&
              (newTaskScheduler.can_divisible || newTaskScheduler.task?.can_divisible) &&
              newTaskScheduler.task?.occupation_time > remaining) {
            // 可以拆分新插入的任务
            await this.splitTaskForPostpone(
              prismaService,
              newTaskScheduler,
              remaining,
              currentDayNo,
            );
            
            // 拆分后，重新检查当天是否还超时
            if (plan && dayLimit !== null) {
              const dayTasks = await prismaService.userTaskScheduler.findMany({
                where: { plan_id: planId, date_no: currentDayNo },
                include: { task: true },
                orderBy: { day_sort: 'asc' },
              });
              const occupiedMinutes = dayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
              const newExcessMinutes = occupiedMinutes - dayLimit;
              if (newExcessMinutes > 0) {
                // 如果还超时，更新 remaining 继续循环
                remaining = newExcessMinutes;
                // 从 excludedTaskIds 中移除 excludeTaskId，以便下次循环时能够再次找到它（如果需要继续拆分）
                excludedTaskIds.delete(excludeTaskId);
                continue;
              } else {
                // 如果不超时了，退出循环
                remaining = 0;
              }
            } else {
              remaining = 0;
            }
            break;
          }
        }
        // 没有更多任务可以推迟，退出循环
        break;
      }

      const taskDuration = candidate.task?.occupation_time || 0;
      if (taskDuration <= 0) {
        excludedTaskIds.add(candidate.task_id);
        continue;
      }

      // 如果需要挪走的时间小于任务时间，需要拆分任务
      if (taskDuration > remaining) {
        const canSplit = candidate.can_divisible || candidate.task?.can_divisible;
        if (!canSplit) {
          excludedTaskIds.add(candidate.task_id);
          continue;
        }

        // 拆分任务
        await this.splitTaskForPostpone(
          prismaService,
          candidate,
          remaining,
          currentDayNo,
        );
      } else {
        // 如果任务时间 <= 需要挪走的时间，直接移动整个任务到次日最顶端
        await this.moveTaskToNextDayTop(prismaService, candidate, currentDayNo);
      }
      
      // 移动任务后，重新检查当天是否还超时
      if (plan && dayLimit !== null) {
        const dayTasks = await prismaService.userTaskScheduler.findMany({
          where: { plan_id: planId, date_no: currentDayNo },
          include: { task: true },
          orderBy: { day_sort: 'asc' },
        });
        const occupiedMinutes = dayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
        const newExcessMinutes = occupiedMinutes - dayLimit;
        if (newExcessMinutes > 0) {
          // 如果还超时，更新 remaining 继续循环
          remaining = newExcessMinutes;
        } else {
          // 如果不超时了，退出循环
          remaining = 0;
        }
      } else {
        // 如果没有传入 plan，使用原来的逻辑
        if (taskDuration > remaining) {
          remaining = 0;
        } else {
          remaining -= taskDuration;
        }
      }
    }
  }

  // 查找需要推迟的任务：按优先级顺序，同一优先级按 day_sort 倒序
  private async findTaskToPostpone(prismaService, params: {
    planId: number;
    currentDayNo: number;
    excludedTaskIds: Set<number>;
  }) {
    const { planId, currentDayNo, excludedTaskIds } = params;
    
    // 优先级顺序：无优先级(9999)、3级优先级、2级优先级、1级优先级
    const priorityOrder = [9999, 3, 2, 1];
    
    for (const priority of priorityOrder) {
      // 查找当前优先级的所有任务，按 day_sort 倒序排列
      const tasks = await prismaService.userTaskScheduler.findMany({
        where: {
          plan_id: planId,
          date_no: currentDayNo,
          priority: priority,
          task_id: { notIn: Array.from(excludedTaskIds) },
        },
        include: { task: true },
        orderBy: { day_sort: 'desc' }, // 倒序，最靠后的先被挪走
      });

      if (tasks.length > 0) {
        return tasks[0]; // 返回第一个（day_sort 最大的）
      }
    }

    return null;
  }

  // 拆分任务用于推迟：将部分时间移到次日最顶端
  private async splitTaskForPostpone(prismaService, candidate, minutesToMove: number, currentDayNo: number) {
    const task = candidate.task;
    if (!task || minutesToMove <= 0) return;

    const total = task.occupation_time;
    const remain = total - minutesToMove;
    if (remain <= 0) {
      // 如果剩余时间 <= 0，直接移动整个任务
      await this.moveTaskToNextDayTop(prismaService, candidate, currentDayNo);
      return;
    }

    const baseName = this.normalizeTaskName(task.name || '');
    // 拆分出来的任务（移到下一天的）名称要体现是被拆出来的
    const moveName = `${baseName}【拆分】(${minutesToMove}/${total})`;
    // 原任务保留剩余部分
    const remainName = `${baseName}(${remain}/${total})`;

    // 创建新任务（需要移到次日的部分）
    const newTask = await prismaService.userTask.create({
      data: {
        user: { connect: { id: task.user_id } },
        plan: { connect: { id: task.plan_id } },
        name: moveName,
        status: task.status,
        group: task.task_group_id ? { connect: { id: task.task_group_id } } : undefined,
        background: task.background,
        suggested_time_start: task.suggested_time_start,
        suggested_time_end: task.suggested_time_end,
        remark: task.remark,
        annex_type: task.annex_type,
        annex: task.annex,
        timing_type: task.timing_type,
        occupation_time: minutesToMove,
        can_divisible: task.can_divisible,
      },
    });

    // 获取次日最顶端的 day_sort（应该是最小的，如果没有任务则为 1）
    const nextDayNo = currentDayNo + 1;
    const nextDayTopSort = await prismaService.userTaskScheduler.findFirst({
      where: {
        plan_id: candidate.plan_id,
        date_no: nextDayNo,
      },
      orderBy: { day_sort: 'asc' },
      select: { day_sort: true },
    });
    const targetDaySort = nextDayTopSort ? nextDayTopSort.day_sort - 1 : 1;
    
    // 如果目标 day_sort <= 0，需要调整次日所有任务的 day_sort
    if (targetDaySort <= 0) {
      await prismaService.userTaskScheduler.updateMany({
        where: {
          plan_id: candidate.plan_id,
          date_no: nextDayNo,
        },
        data: {
          day_sort: { increment: 1 },
        },
      });
    }

    // 创建新任务的调度信息，放在次日最顶端
    await prismaService.userTaskScheduler.create({
      data: {
        plan: { connect: { id: candidate.plan_id } },
        task: { connect: { id: newTask.id } },
        priority: candidate.priority,
        global_sort: candidate.global_sort,
        group_sort: candidate.group_sort,
        day_sort: targetDaySort <= 0 ? 1 : targetDaySort,
        can_divisible: candidate.can_divisible,
        date_no: nextDayNo,
        status: candidate.status,
      },
    });

    // 更新原任务，保留剩余部分
    await prismaService.userTask.update({
      where: { id: task.id },
      data: {
        occupation_time: remain,
        name: remainName,
      },
    });
    // 注意：拆分任务时，原任务还在当前天，只是减少了时间，所以不需要调整 day_sort
  }

  // 将任务移到次日最顶端
  private async moveTaskToNextDayTop(prismaService, schedulerTask, currentDayNo: number) {
    const nextDayNo = currentDayNo + 1;
    
    // 获取次日最顶端的 day_sort
    const nextDayTopSort = await prismaService.userTaskScheduler.findFirst({
      where: {
        plan_id: schedulerTask.plan_id,
        date_no: nextDayNo,
      },
      orderBy: { day_sort: 'asc' },
      select: { day_sort: true },
    });
    const targetDaySort = nextDayTopSort ? nextDayTopSort.day_sort - 1 : 1;
    
    // 如果目标 day_sort <= 0，需要调整次日所有任务的 day_sort
    if (targetDaySort <= 0) {
      await prismaService.userTaskScheduler.updateMany({
        where: {
          plan_id: schedulerTask.plan_id,
          date_no: nextDayNo,
        },
        data: {
          day_sort: { increment: 1 },
        },
      });
    }

    // 调整当前天其他任务的 day_sort（因为移除了这个任务）
    await prismaService.userTaskScheduler.updateMany({
      where: {
        plan_id: schedulerTask.plan_id,
        date_no: schedulerTask.date_no,
        day_sort: { gt: schedulerTask.day_sort },
      },
      data: {
        day_sort: { decrement: 1 },
      },
    });

    // 更新任务的 date_no 和 day_sort
    await prismaService.userTaskScheduler.update({
      where: { task_id: schedulerTask.task_id },
      data: {
        date_no: nextDayNo,
        day_sort: targetDaySort <= 0 ? 1 : targetDaySort,
      },
    });
  }

  private async rebuildPlanOrders(prismaService, planId: number, targetDayNo?: number, originalDayTaskIds?: number[]) {
    const schedulers = await prismaService.userTaskScheduler.findMany({
      where: { plan_id: planId },
      include: { task: { select: { task_group_id: true } } },
      orderBy: [
        { date_no: 'asc' },
        { day_sort: 'asc' },
        { global_sort: 'asc' },
      ],
    });

    let globalSort = 1;
    const groupCursor = new Map<number, number>();

    const byDate = schedulers.reduce((acc, s) => {
      if (!acc[s.date_no]) acc[s.date_no] = [];
      acc[s.date_no].push(s);
      return acc;
    }, {} as Record<number, typeof schedulers>);

    for (const dateNo of Object.keys(byDate).sort((a, b) => Number(a) - Number(b))) {
      const dayTasks = byDate[Number(dateNo)];
      let daySort = 1;

      if (targetDayNo !== undefined && Number(dateNo) === targetDayNo && originalDayTaskIds) {
        const originalTasks = dayTasks.filter(t => originalDayTaskIds.includes(t.task_id));
        const newTasks = dayTasks.filter(t => !originalDayTaskIds.includes(t.task_id));

        originalTasks.sort((a, b) => a.day_sort - b.day_sort);
        newTasks.sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return (a.task?.id || a.task_id) - (b.task?.id || b.task_id);
        });

        for (const scheduler of [...originalTasks, ...newTasks]) {
          let groupSort = null;
          const groupId = scheduler.task?.task_group_id ?? null;
          if (groupId !== null) {
            const next = (groupCursor.get(groupId) ?? 0) + 1;
            groupCursor.set(groupId, next);
            groupSort = next;
          }

          await prismaService.userTaskScheduler.update({
            where: { task_id: scheduler.task_id },
            data: {
              day_sort: daySort,
              global_sort: globalSort,
              group_sort: groupSort,
            },
          });
          daySort += 1;
          globalSort += 1;
        }
      } else {
        for (const scheduler of dayTasks) {
          let groupSort = null;
          const groupId = scheduler.task?.task_group_id ?? null;
          if (groupId !== null) {
            const next = (groupCursor.get(groupId) ?? 0) + 1;
            groupCursor.set(groupId, next);
            groupSort = next;
          }

          await prismaService.userTaskScheduler.update({
            where: { task_id: scheduler.task_id },
            data: {
              day_sort: daySort,
              global_sort: globalSort,
              group_sort: groupSort,
            },
          });
          daySort += 1;
          globalSort += 1;
        }
      }
    }
  }
}
