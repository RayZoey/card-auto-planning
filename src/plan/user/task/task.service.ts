/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-11-09 22:00:28
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
  async delete(id: number, needAutoPlan: boolean) {
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

  
}
