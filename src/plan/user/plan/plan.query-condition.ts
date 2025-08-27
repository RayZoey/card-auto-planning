/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-08-27 22:45:48
 * @FilePath: /card-auto-planning/src/plan/platform/plan-template/plan-template.query-condition.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Column, Operation} from '@src/common/query-object.decorator';

export class UserPlanQueryCondition {
  @Column('id')
  @Operation('equals')
  public id: number;

  @Column('user_id')
  @Operation('equals')
  public userId: number;

  @Column('name')
  @Operation('contains')
  public name: string;

  @Column('status')
  @Operation('equals')
  public status: string;

}
