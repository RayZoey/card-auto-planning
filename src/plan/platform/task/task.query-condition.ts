/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-08-27 22:34:30
 * @FilePath: /card-auto-planning/src/plan/platform/plan-template/plan-template.query-condition.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { TaskTimingType } from '@prisma/client';
import {Column, Operation} from '@src/common/query-object.decorator';

export class PlatformTaskQueryCondition {
  @Column('id')
  @Operation('equals')
  public id: number;

  @Column('name')
  @Operation('contains')
  public name: string;

  @Column('preset_task_tag_id')
  @Operation('equals')
  public presetTaskTagId: number;

  @Column('remark')
  @Operation('contains')
  public remark: string;

  @Column('timing_type')
  @Operation('equals')
  public timingType: TaskTimingType;
}
