/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-09-06 17:14:27
 * @FilePath: /card-backend/src/card/pdf-print-info/pdf-print-info.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {BaseService} from '@src/base/base.service';
import {QueryFilter} from '@src/common/query-filter';
import {QueryConditionParser} from '@src/common/query-condition-parser';
import { PlanStatus, TaskStatus, TaskTimingType, DailyTaskStatus } from '@prisma/client';
import { UserTaskCreateDto } from './task.create.dto';
import { UserTaskUpdateDto } from './task.update.dto';
import { InsertTaskDto, CutTaskDto, SkipTaskDto, PostponeTaskDto, TaskOperationResponse } from './task-operation.dto';
import { AutoPlanningService } from '../auto-planning/planing.service';
const moment = require('moment');

@Injectable()
export class UserTaskService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly baseService: BaseService,
    private readonly queryConditionParser: QueryConditionParser,
    private readonly autoPlanningService: AutoPlanningService
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

  async delete(id: number) {
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
        [TaskStatus.WAITING]: [TaskStatus.PROGRESS],
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

      /* 跳过任务通过专门的 skipTask 接口处理，这里不再处理 */

      await tx.userTask.update({ where: { id: taskId }, data: upd });

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

  /**
   * 插入新任务
   */
  async insertTask(userId: number, planId: number, dto: InsertTaskDto): Promise<TaskOperationResponse> {
    return await this.prismaService.$transaction(async (tx) => {
      // 验证计划权限
      const plan = await tx.userPlan.findFirst({
        where: { id: planId, user_id: userId, status: { not: PlanStatus.COMPLETE } }
      });
      if (!plan) {
        throw new Error('计划不存在或无权限');
      }

      // 验证当日时间限制
      const validation = await this.autoPlanningService.validateDailyTaskTime(
        planId, 
        dto.target_date, 
        dto.occupation_time || 0
      );

      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message,
          validation
        };
      }

      // 创建任务
      const task = await tx.userTask.create({
        data: {
          user_id: userId,
          plan_id: planId,
          task_group_id: dto.task_group_id,
          name: dto.name,
          priority: dto.priority,
          background: dto.background,
          suggested_time_start: dto.suggested_time_start,
          suggested_time_end: dto.suggested_time_end,
          remark: dto.remark,
          annex_type: dto.annex_type,
          annex: dto.annex,
          timing_type: dto.timing_type,
          occupation_time: dto.occupation_time,
          can_divisible: dto.can_divisible,
          planned_date: new Date(dto.target_date),
          seq: dto.target_seq || 0,
          is_manually_adjusted: true
        }
      });

      // 创建每日任务记录
      await tx.userDailyTask.create({
        data: {
          user_id: userId,
          plan_id: planId,
          user_task_id: task.id,
          date: new Date(dto.target_date),
          planned_minutes: dto.occupation_time || 0,
          seq: dto.target_seq || 0,
          status: DailyTaskStatus.PLANNED
        }
      });

      // 记录操作
      await tx.userPlanOperation.create({
        data: {
          user_id: userId,
          plan_id: planId,
          operation: 'INSERT_TASK',
          payload: {
            task_id: task.id,
            target_date: dto.target_date,
            target_seq: dto.target_seq
          }
        }
      });

      return {
        success: true,
        message: '任务插入成功',
        data: task
      };
    });
  }

  /**
   * 切割任务
   */
  async cutTask(userId: number, planId: number, dto: CutTaskDto): Promise<TaskOperationResponse> {
    return await this.prismaService.$transaction(async (tx) => {
      const task = await tx.userTask.findFirst({
        where: { 
          id: dto.task_id, 
          user_id: userId, 
          plan_id: planId,
          status: TaskStatus.WAITING,
          can_divisible: true
        }
      });

      if (!task) {
        throw new Error('任务不存在、无权限或不可分割');
      }

      if (dto.segments_count < 2) {
        throw new Error('至少需要分割成2段');
      }

      const segmentMinutes = Math.floor((task.occupation_time || 0) / dto.segments_count);
      const segments = [];

      // 创建分割段
      for (let i = 0; i < dto.segments_count; i++) {
        const isLast = i === dto.segments_count - 1;
        const minutes = isLast ? (task.occupation_time || 0) - (segmentMinutes * (dto.segments_count - 1)) : segmentMinutes;
        
        const segment = await tx.userTaskSegment.create({
          data: {
            user_task_id: task.id,
            segment_index: i,
            total_minutes: minutes
          }
        });
        segments.push(segment);
      }

      // 记录操作
      await tx.userPlanOperation.create({
        data: {
          user_id: userId,
          plan_id: planId,
          operation: 'CUT_TASK',
          payload: {
            task_id: dto.task_id,
            segments_count: dto.segments_count,
            segments: segments.map(s => ({ id: s.id, minutes: s.total_minutes }))
          }
        }
      });

      return {
        success: true,
        message: `任务已分割成${dto.segments_count}段`,
        data: { task, segments }
      };
    });
  }

  /**
   * 跳过任务
   */
  async skipTask(userId: number, planId: number, dto: SkipTaskDto): Promise<TaskOperationResponse> {
    return await this.prismaService.$transaction(async (tx) => {
      const task = await tx.userTask.findFirst({
        where: { 
          id: dto.task_id, 
          user_id: userId, 
          plan_id: planId,
          status: TaskStatus.WAITING
        }
      });

      if (!task) {
        throw new Error('任务不存在或无权限');
      }

      // 更新任务状态
      await tx.userTask.update({
        where: { id: dto.task_id },
        data: {
          status: TaskStatus.SKIP,
          actual_time_end: new Date()
        }
      });

      // 更新每日任务状态
      await tx.userDailyTask.updateMany({
        where: {
          user_task_id: dto.task_id,
          plan_id: planId
        },
        data: {
          status: DailyTaskStatus.GIVE_UP
        }
      });

      // 记录操作
      await tx.userPlanOperation.create({
        data: {
          user_id: userId,
          plan_id: planId,
          operation: 'SKIP_TASK',
          payload: {
            task_id: dto.task_id,
            reason: dto.reason
          }
        }
      });

      return {
        success: true,
        message: '任务已跳过',
        data: { task_id: dto.task_id }
      };
    });
  }

  /**
   * 推迟任务
   */
  async postponeTask(userId: number, planId: number, dto: PostponeTaskDto): Promise<TaskOperationResponse> {
    return await this.prismaService.$transaction(async (tx) => {
      const task = await tx.userTask.findFirst({
        where: { 
          id: dto.task_id, 
          user_id: userId, 
          plan_id: planId,
          status: TaskStatus.WAITING
        }
      });

      if (!task) {
        throw new Error('任务不存在或无权限');
      }

      // 验证新日期的时间限制
      const validation = await this.autoPlanningService.validateDailyTaskTime(
        planId, 
        dto.new_date, 
        task.occupation_time || 0
      );

      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message,
          validation
        };
      }

      // 删除原日期的每日任务记录
      await tx.userDailyTask.deleteMany({
        where: {
          user_task_id: dto.task_id,
          plan_id: planId
        }
      });

      // 更新任务计划日期
      await tx.userTask.update({
        where: { id: dto.task_id },
        data: {
          planned_date: new Date(dto.new_date),
          seq: dto.new_seq || 0,
          is_manually_adjusted: true,
          original_planned_date: task.planned_date
        }
      });

      // 创建新日期的每日任务记录
      await tx.userDailyTask.create({
        data: {
          user_id: userId,
          plan_id: planId,
          user_task_id: dto.task_id,
          date: new Date(dto.new_date),
          planned_minutes: task.occupation_time || 0,
          seq: dto.new_seq || 0,
          status: DailyTaskStatus.PLANNED
        }
      });

      // 记录操作
      await tx.userPlanOperation.create({
        data: {
          user_id: userId,
          plan_id: planId,
          operation: 'POSTPONE_TASK',
          payload: {
            task_id: dto.task_id,
            old_date: task.planned_date?.toISOString(),
            new_date: dto.new_date,
            new_seq: dto.new_seq
          }
        }
      });

      return {
        success: true,
        message: '任务已推迟',
        data: { 
          task_id: dto.task_id,
          new_date: dto.new_date,
          new_seq: dto.new_seq
        }
      };
    });
  }
}
