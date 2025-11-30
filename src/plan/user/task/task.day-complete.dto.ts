/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-11-13 22:09:37
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-11-13 22:09:37
 * @FilePath: /card-auto-planning/src/plan/user/task/task.day-complete.dto.ts
 * @Description: 每日结束打卡相关DTO
 */
import {Expose, Type} from 'class-transformer';

export class MarkDayCompleteDto {
  @Expose({name: 'plan_id'})
  @Type(() => Number)
  plan_id: number;

  @Expose({name: 'date_no'})
  @Type(() => Number)
  date_no: number;
}

export class AdvanceNextDayTasksDto {
  @Expose({name: 'plan_id'})
  @Type(() => Number)
  plan_id: number;

  @Expose({name: 'date_no'})
  @Type(() => Number)
  date_no: number;

  @Expose({name: 'next_day_task_ids'})
  @Type(() => Array)
  next_day_task_ids: number[];

  @Expose({name: 'need_auto_fill'})
  @Type(() => Boolean)
  need_auto_fill: boolean;
}

export class TaskActionDto {
  @Expose({name: 'task_id'})
  @Type(() => Number)
  task_id: number;

  @Expose({name: 'action'})
  action: 'skip' | 'postpone';

  @Expose({name: 'need_auto_fill'})
  @Type(() => Boolean)
  need_auto_fill?: boolean;
}

export class ProcessDayTasksDto {
  @Expose({name: 'plan_id'})
  @Type(() => Number)
  plan_id: number;

  @Expose({name: 'date_no'})
  @Type(() => Number)
  date_no: number;

  @Expose({name: 'tasks'})
  @Type(() => TaskActionDto)
  tasks: TaskActionDto[];
}

