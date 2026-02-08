/*
 * @Author: Reflection lighthouseinmind@yeah.net
 * @Date: 2025-08-27 22:22:10
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-02-08 17:06:19
 * @FilePath: /card-auto-planning/src/invite-code/invit-code.query.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import {Expose, Type} from 'class-transformer';

export class InviteCodeQuery {
  @Expose({name: 'id'})
  @Type(() => Number)
  id: number;

  @Expose({name: 'code'})
  @Type(() => String)
  code: string;

  @Expose({name: 'status'})
  @Type(() => String)
  status: string;

  @Expose({name: 'created_at_begin'})
  @Type(() => Date)
  createdAtBegin: Date;

  @Expose({name: 'created_at_end'})
  @Type(() => Date)
  createdAtEnd: Date;
}
