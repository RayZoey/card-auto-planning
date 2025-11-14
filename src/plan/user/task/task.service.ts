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
    await prismaService.userTaskScheduler.delete({
      where: { task_id: scheduler.task_id },
    });

    const plan = await prismaService.userPlan.findUnique({
      where: { id: scheduler.plan_id },
    });
    if (!plan) {
      throw new Error('计划不存在');
    }

    const dayLimit = needAutoFill ? this.resolvePlanDayLimit(plan.limit_hour, scheduler.date_no) : null;
    const groupPreference = {
      id: scheduler.task?.task_group_id ?? null,
      cursor: scheduler.group_sort ?? null,
    };
    const dayTasks = await prismaService.userTaskScheduler.findMany({
      where: { plan_id: scheduler.plan_id, date_no: scheduler.date_no },
      include: { task: true },
      orderBy: { day_sort: 'asc' },
    });
    const occupiedMinutes = dayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
    const targetMinutes = needAutoFill && dayLimit !== null
      ? Math.max(dayLimit - occupiedMinutes, 0)
      : (scheduler.task?.occupation_time || 0);

    if (targetMinutes > 0) {
      const currentDayTaskIds = dayTasks.map(item => item.task_id);
      const fillResult = await this.fillDayFromFuture(prismaService, {
        planId: scheduler.plan_id,
        targetDayNo: scheduler.date_no,
        minutesNeeded: targetMinutes,
        preferGroupId: groupPreference.id,
        deletedGroupSort: groupPreference.cursor,
        currentDayTaskIds,
      });
      this.updateGroupPreference(groupPreference, fillResult);
    }

    if (needAutoFill) {
      await this.rebalanceFollowingDays(
        prismaService,
        scheduler.plan_id,
        scheduler.date_no + 1,
        plan.limit_hour,
        groupPreference,
      );
    }

    await this.rebuildPlanOrders(prismaService, scheduler.plan_id);
  }

  private updateGroupPreference(
    preference: { id: number | null; cursor: number | null },
    fillResult: { lastGroupSortUsed: number | null; groupExhausted: boolean },
  ) {
    if (!preference.id) return;
    if (fillResult.lastGroupSortUsed !== null) {
      preference.cursor = fillResult.lastGroupSortUsed;
    }
    if (fillResult.groupExhausted) {
      preference.id = null;
      preference.cursor = null;
    }
  }

  private async fillDayFromFuture(prismaService, params: {
    planId: number;
    targetDayNo: number;
    minutesNeeded: number;
    preferGroupId: number | null;
    deletedGroupSort: number | null;
    currentDayTaskIds: number[];
  }): Promise<{ lastGroupSortUsed: number | null; groupExhausted: boolean }> {
    const { planId, targetDayNo, preferGroupId, currentDayTaskIds } = params;
    let remaining = params.minutesNeeded;
    if (remaining <= 0) {
      return { lastGroupSortUsed: null, groupExhausted: false };
    }

    let groupCursor = params.deletedGroupSort ?? null;
    const dayTaskCount = await prismaService.userTaskScheduler.count({
      where: { plan_id: planId, date_no: targetDayNo },
    });
    let insertionOffset = 0;
    const candidates = [];
    const used = new Set<number>(currentDayTaskIds);
    let lastGroupSortUsed: number | null = null;
    let usedGroupCount = 0;
    let totalGroupCandidates = 0;

    if (preferGroupId !== null) {
      const groupWhere: any = {
        plan_id: planId,
        task: { task_group_id: preferGroupId },
        group_sort: groupCursor !== null ? { gt: groupCursor } : { gt: 0 },
      };
      const nextGroupTasks = await prismaService.userTaskScheduler.findMany({
        where: groupWhere,
        include: { task: true },
        orderBy: { group_sort: 'asc' },
      });
      for (const groupTask of nextGroupTasks) {
        if (used.has(groupTask.task_id)) continue;
        candidates.push(groupTask);
        used.add(groupTask.task_id);
      }
      totalGroupCandidates = candidates.length;
    }

    if (preferGroupId === null || candidates.length === 0) {
      const prioritizedTasks = await prismaService.userTaskScheduler.findMany({
        where: {
          plan_id: planId,
          date_no: { gte: targetDayNo },
        },
        include: { task: true },
        orderBy: [
          { date_no: 'asc' },
          { priority: 'asc' },
          { task_id: 'asc' },
          { day_sort: 'asc' },
        ],
      });

      for (const task of prioritizedTasks) {
        if (used.has(task.task_id)) continue;
        candidates.push(task);
        used.add(task.task_id);
      }
    }

    for (const candidate of candidates) {
      if (remaining <= 0) break;
      const duration = candidate.task?.occupation_time || 0;
      if (duration === 0) continue;
      insertionOffset += 1;

      const isPreferredGroup = preferGroupId !== null && candidate.task?.task_group_id === preferGroupId;
      if (isPreferredGroup) {
        usedGroupCount += 1;
        if (candidate.group_sort !== null) {
          lastGroupSortUsed = candidate.group_sort;
          groupCursor = candidate.group_sort;
        }
      }

      if (duration <= remaining) {
        await prismaService.userTaskScheduler.update({
          where: { task_id: candidate.task_id },
          data: {
            date_no: targetDayNo,
            day_sort: dayTaskCount + insertionOffset,
          },
        });
        remaining -= duration;
        continue;
      }

      const canSplit = candidate.can_divisible || candidate.task?.can_divisible;
      if (!canSplit) {
        insertionOffset -= 1;
        continue;
      }

      await this.splitTaskForFill(
        prismaService,
        candidate,
        remaining,
        targetDayNo,
        dayTaskCount + insertionOffset,
      );
      remaining = 0;
    }

    const groupExhausted =
      preferGroupId !== null &&
      (totalGroupCandidates === 0 || usedGroupCount >= totalGroupCandidates);
    return { lastGroupSortUsed, groupExhausted };
  }

  private async rebalanceFollowingDays(
    prismaService,
    planId: number,
    startDayNo: number,
    limitHour: any,
    groupPreference: { id: number | null; cursor: number | null },
  ) {
    const maxDayRes = await prismaService.userTaskScheduler.aggregate({
      where: { plan_id: planId },
      _max: { date_no: true },
    });
    const maxDay = maxDayRes?._max?.date_no ?? 0;
    if (maxDay === 0) return;

    for (let day = Math.max(startDayNo, 1); day <= maxDay; day++) {
      const dayLimit = this.resolvePlanDayLimit(limitHour, day);
      if (dayLimit === null) continue;

      const dayTasks = await prismaService.userTaskScheduler.findMany({
        where: { plan_id: planId, date_no: day },
        include: { task: true },
        orderBy: { day_sort: 'asc' },
      });
      const occupied = dayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
      const minutesNeeded = dayLimit - occupied;
      if (minutesNeeded <= 0) continue;

      const currentDayTaskIds = dayTasks.map(item => item.task_id);
      const fillResult = await this.fillDayFromFuture(prismaService, {
        planId,
        targetDayNo: day,
        minutesNeeded,
        preferGroupId: groupPreference.id,
        deletedGroupSort: groupPreference.cursor,
        currentDayTaskIds,
      });
      this.updateGroupPreference(groupPreference, fillResult);
    }
  }

  private async splitTaskForFill(prismaService, candidate, minutesToMove: number, targetDayNo: number, daySort: number) {
    const task = candidate.task;
    if (!task || minutesToMove <= 0) return;

    const total = task.occupation_time;
    const remain = total - minutesToMove;
    if (remain <= 0) {
      await prismaService.userTaskScheduler.update({
        where: { task_id: candidate.task_id },
        data: { date_no: targetDayNo, day_sort: daySort },
      });
      return;
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
  }

  private normalizeTaskName(name: string): string {
    return name.replace(/\(\d+\/\d+\)\s*$/, '').trim();
  }

  private async rebuildPlanOrders(prismaService, planId: number) {
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
    let currentDate = -1;
    let daySort = 0;
    const groupCursor = new Map<number, number>();

    for (const scheduler of schedulers) {
      if (scheduler.date_no !== currentDate) {
        currentDate = scheduler.date_no;
        daySort = 0;
      }
      daySort += 1;

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
      globalSort += 1;
    }
  }
}
