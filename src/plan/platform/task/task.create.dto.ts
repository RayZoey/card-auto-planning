/*
 * @Author: Reflection lighthouseinmind@yeah.net
 * @Date: 2025-08-25 21:59:11
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-11-09 21:12:23
 * @FilePath: /card-auto-planning/src/plan/platform/task/task.create.dto.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { TaskAnnexType, TaskTimingType } from '@prisma/client';
import {Expose, Type} from 'class-transformer';

export class PlatformTaskCreateDto {

  @Expose({name: 'name'})
  @Type(() => String)
  name: string;

  @Expose({name: 'suggested_time_start'})
  @Type(() => String)
  suggestedTimeSstart: string;

  @Expose({name: 'suggested_time_end'})
  @Type(() => String)
  suggestedTimeEnd: string;

  @Expose({name: 'remark'})
  @Type(() => String)
  remark: string;

  @Expose({name: 'annex_type'})
  @Type(() => String)
  annexType: TaskAnnexType;

  @Expose({name: 'annex'})
  @Type(() => String)
  annex: string;

  @Expose({name: 'timing_type'})
  @Type(() => String)
  timingType: TaskTimingType;

  @Expose({name: 'occupation_time'})
  @Type(() => Number)
  occupation_time: number;

  @Expose({name: 'can_divisible'})
  @Type(() => Boolean)
  canDivisible: boolean;

  @Expose({name: 'platform_task_group_id'})
  @Type(() => Number)
  platformTaskGroupId?: number; // 任务集ID（可选，如果指定则创建任务集关联）

  @Expose({name: 'group_sort'})
  @Type(() => Number)
  groupSort?: number; // 任务集排序（可选）

  @Expose({name: 'priority'})
  @Type(() => Number)
  priority?: number; // 任务优先级（可选）

  @Expose({name: 'preset_task_tag_id'})
  @Type(() => Number)
  presetTaskTagId?: number; // 任务标签ID（可选）
}