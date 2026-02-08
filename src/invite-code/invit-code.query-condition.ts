/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-02-08 17:06:43
 * @FilePath: /card-auto-planning/src/plan/platform/plan-template/plan-template.query-condition.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Column, Operation} from '@src/common/query-object.decorator';

export class InviteCodeQueryCondition {
  @Column('id')
  @Operation('equals')
  public id: number;

  @Column('code')
  @Operation('contains')
  public code: string;

  @Column('status')
  @Operation('equals')
  public status: string;

  @Column('created_at_begin')
  @Operation('gte')
  public createdAtBegin: Date;

  @Column('created_at_end')
  @Operation('lte')
  public createdAtEnd: Date;
}
