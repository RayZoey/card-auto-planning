/*
 * @Author: Reflection lighthouseinmind@yeah.net
 * @Date: 2025-08-27 22:21:49
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-12-16 21:46:00
 * @FilePath: /card-auto-planning/src/plan/user/plan/plan.create.dto.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { PlanStatus, TaskAnnexType, TaskStatus, TaskTimingType, UserTaskScheduler } from '@prisma/client';
import {Expose, Type} from 'class-transformer';

export class UserTaskCreateDto {

  @Expose({name: 'name'})
  @Type(() => String)
  name: string;

  @Expose({name: 'plan_id'})
  @Type(() => Number)
  plan_id: number;

  @Expose({name: 'preset_task_tag_id'})
  @Type(() => Number)
  preset_task_tag_id: number;
  
  @Expose({name: 'task_group_id'})
  @Type(() => Number)
  task_group_id: number;

  @Expose({name: 'suggested_time_start'})
  @Type(() => String)
  suggested_time_start: string;

  @Expose({name: 'suggested_time_end'})
  @Type(() => String)
  suggested_time_end: string;

  @Expose({name: 'remark'})
  @Type(() => String)
  remark: string;

  @Expose({name: 'annex_type'})
  @Type(() => String)
  annex_type: TaskAnnexType;

  @Expose({name: 'annex'})
  @Type(() => String)
  annex: string;

  @Expose({name: 'timing_type'})
  @Type(() => String)
  timing_type: TaskTimingType;

  @Expose({name: 'occupation_time'})
  @Type(() => Number)
  occupation_time: number;

  @Expose({name: 'can_divisible'})
  @Type(() => Boolean)
  can_divisible: boolean;

  @Expose({name: 'status'})
  @Type(() => String)
  status: TaskStatus;

  @Expose({name: 'UserTaskScheduler'})
  @Type(() => Object)
  UserTaskScheduler: UserTaskScheduler;
}