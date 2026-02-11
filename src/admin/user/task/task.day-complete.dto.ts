/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-11-13 22:09:37
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-02-11 23:18:32
 * @FilePath: /card-auto-planning/src/plan/user/task/task.day-complete.dto.ts
 * @Description: 每日结束打卡相关DTO
 */
import {Expose, Type} from 'class-transformer';

export class AdminMarkDayCompleteDto {
  @Expose({name: 'plan_id'})
  @Type(() => Number)
  plan_id: number;

  @Expose({name: 'date_no'})
  @Type(() => Number)
  date_no: number;

  /** 评分/前端自定义数据，非必填，存 JSON */
  @Expose({name: 'score'})
  score: string;
}

export class AdminAdvanceNextDayTasksDto {
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

export class AdminTaskActionDto {
  @Expose({name: 'task_id'})
  @Type(() => Number)
  task_id: number;

  @Expose({name: 'action'})
  action: 'skip' | 'postpone';
}

export class AdminProcessDayTasksDto {
  @Expose({name: 'plan_id'})
  @Type(() => Number)
  plan_id: number;

  @Expose({name: 'date_no'})
  @Type(() => Number)
  date_no: number;

  @Expose({name: 'need_auto_fill'})
  @Type(() => Boolean)
  need_auto_fill: boolean;

  @Expose({name: 'tasks'})
  @Type(() => AdminTaskActionDto)
  tasks: AdminTaskActionDto[];
}

