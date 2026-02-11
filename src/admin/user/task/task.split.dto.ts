/*
 * @Author: Reflection lighthouseinmind@yeah.net
 * @Date: 2025-12-16 23:00:00
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-02-11 23:14:48
 * @FilePath: /card-auto-planning/src/plan/user/task/task.split.dto.ts
 * @Description: 用户任务拆分 DTO
 */
import { Expose, Type } from 'class-transformer';

export class AdminUserTaskSplitDto {
  @Expose({ name: 'first_name' })
  @Type(() => String)
  first_name: string;

  @Expose({ name: 'first_minutes' })
  @Type(() => Number)
  first_minutes: number;

  @Expose({ name: 'second_name' })
  @Type(() => String)
  second_name: string;

  @Expose({ name: 'second_minutes' })
  @Type(() => Number)
  second_minutes: number;
}
