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

  async create(userId: number, dto: UserTaskCreateDto) {
    return this.prismaService.userTask.create({
      // @ts-ignore
      data: {
        user_id: userId,
        name: dto.name,
        status: dto.status
      }
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

    await prismaService.userTaskScheduler.delete({
      where: { task_id: scheduler.task_id },
    });

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
    
    if (minutesNeeded > 0) {
      await this.fillDayGap(prismaService, {
        planId: scheduler.plan_id,
        targetDayNo: scheduler.date_no,
        minutesNeeded,
        preferGroupId: scheduler.task?.task_group_id ?? null,
        deletedGroupSort: scheduler.group_sort,
        originalDayTaskIds,
      });
    }

    await this.rebuildPlanOrders(prismaService, scheduler.plan_id, scheduler.date_no, originalDayTaskIds);
  }

  private async fillDayGap(prismaService, params: {
    planId: number;
    targetDayNo: number;
    minutesNeeded: number;
    preferGroupId: number | null;
    deletedGroupSort: number | null;
    originalDayTaskIds: number[];
  }) {
    const { planId, targetDayNo } = params;
    let remaining = params.minutesNeeded;
    if (remaining <= 0) return;

    let preferGroupId = params.preferGroupId;
    let groupCursor = params.deletedGroupSort ?? null;
    const excludedTaskIds = new Set<number>();

    let nextDaySort = await prismaService.userTaskScheduler.count({
      where: { plan_id: planId, date_no: targetDayNo },
    }) + 1;

    while (remaining > 0) {
      let candidate = await this.findPreferredGroupCandidate(prismaService, {
        planId,
        preferGroupId,
        groupCursor,
        excludedTaskIds,
      });

      if (!candidate) {
        preferGroupId = null;
        groupCursor = null;
        candidate = await this.findGlobalCandidate(prismaService, {
          planId,
          targetDayNo,
          excludedTaskIds,
        });
      }

      if (!candidate) break;

      const duration = candidate.task?.occupation_time || 0;
      if (duration <= 0) {
        excludedTaskIds.add(candidate.task_id);
        continue;
      }

      if (duration <= remaining) {
        await this.moveSchedulerTask(prismaService, candidate, targetDayNo, nextDaySort);
        remaining -= duration;
        nextDaySort += 1;
        if (candidate.task?.task_group_id === preferGroupId && candidate.group_sort !== null) {
          groupCursor = candidate.group_sort;
        }
        continue;
      }

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
    }
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

  private async findPreferredGroupCandidate(prismaService, params: {
    planId: number;
    preferGroupId: number | null;
    groupCursor: number | null;
    excludedTaskIds: Set<number>;
  }) {
    if (!params.preferGroupId) return null;
    return prismaService.userTaskScheduler.findFirst({
      where: {
        plan_id: params.planId,
        task_id: { notIn: Array.from(params.excludedTaskIds) },
        task: { task_group_id: params.preferGroupId },
        group_sort: params.groupCursor !== null ? { gt: params.groupCursor } : { gt: 0 },
      },
      include: { task: true },
      orderBy: { group_sort: 'asc' },
    });
  }

  private async findGlobalCandidate(prismaService, params: {
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
        { day_sort: 'asc' },
        { task_id: 'asc' },
      ],
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
