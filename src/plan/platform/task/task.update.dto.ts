/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-08-26 11:34:18
 * @FilePath: /card-auto-planning/src/plan/platform/plan-template/plan-template.update.dto.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { TaskAnnexType, TaskTimingType } from '@prisma/client';
import {Expose, Type} from 'class-transformer';

export class PlatformTaskUpdateDto {

  @Expose({name: 'name'})
  @Type(() => String)
  name: string;

  @Expose({name: 'priority'})
  @Type(() => Number)
  priority: number;

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
  occupationTime: number;

  @Expose({name: 'can_divisible'})
  @Type(() => Boolean)
  canDivisible: boolean;
  
}
