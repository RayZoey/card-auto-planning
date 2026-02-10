/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-08-26 11:34:18
 * @FilePath: /card-auto-planning/src/plan/platform/task/task.update-sort.dto.ts
 * @Description: 任务在任务集中的顺序变更DTO
 */
import {Expose, Type} from 'class-transformer';

export class PlatformTaskUpdateSortDto {
  @Expose({name: 'group_sort'})
  @Type(() => Number)
  groupSort: number; // 新的任务集内排序值
}
