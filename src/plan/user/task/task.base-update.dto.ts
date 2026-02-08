/*
 * @Author: Reflection lighthouseinmind@yeah.net
 * @Date: 2025-12-17 23:00:00
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-02-01 16:47:58
 * @FilePath: /card-auto-planning/src/plan/user/task/task.base-update.dto.ts
 * @Description: 用户任务基础信息编辑 DTO
 */
import { TaskAnnexType, TaskTimingType } from '@prisma/client';
import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class UserTaskBaseUpdateDto {
  /** 是否在占用时间/优先级变动后触发自动规划（如从次日切割任务往前挪等）；不传或 false 则仅更新信息 */
  @Expose({ name: 'need_auto_plan' })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  need_auto_plan?: boolean;

  @Expose({ name: 'name' })
  @Type(() => String)
  name: string;

  @Expose({ name: 'task_group_id' })
  @Type(() => Number)
  task_group_id: number | null;

  @Expose({ name: 'occupation_time' })
  @Type(() => Number)
  occupation_time: number;

  @Expose({ name: 'suggested_time_start' })
  @Type(() => String)
  suggested_time_start: string;

  @Expose({ name: 'suggested_time_end' })
  @Type(() => String)
  suggested_time_end: string;

  @Expose({ name: 'remark' })
  @Type(() => String)
  remark: string;

  @Expose({ name: 'annex_type' })
  @Type(() => String)
  annex_type: TaskAnnexType;

  @Expose({ name: 'annex' })
  @Type(() => String)
  annex: string;

  @Expose({ name: 'priority' })
  @Type(() => Number)
  priority: number;

  @Expose({ name: 'preset_task_tag_id' })
  @Type(() => Number)
  preset_task_tag_id: number;

  @Expose({ name: 'timing_type' })
  @Type(() => String)
  timing_type: TaskTimingType;

}
