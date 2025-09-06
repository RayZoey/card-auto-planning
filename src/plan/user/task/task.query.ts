/*
 * @Author: Reflection lighthouseinmind@yeah.net
 * @Date: 2025-08-27 22:22:10
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-09-04 19:43:56
 * @FilePath: /card-auto-planning/src/plan/user/plan/plan-template.query.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import {Expose, Type} from 'class-transformer';

export class UserTaskQuery {
  @Expose({name: 'id'})
  @Type(() => Number)
  id: number;

  @Expose({name: 'user_id'})
  @Type(() => Number)
  user_id: number;

}
