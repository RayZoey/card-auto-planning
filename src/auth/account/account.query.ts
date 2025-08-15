/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-04-14 10:51:15
 * @LastEditors: Ray lighthouseinmind@yeah.net
 * @LastEditTime: 2025-05-15 15:27:49
 * @FilePath: /water/src/auth/account/account.query.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Expose, Type} from 'class-transformer';

export class AccountQuery {
  @Expose({name: 'role_id'})
  @Type(() => Number)
  roleId: number;

  @Expose({name: 'username'})
  @Type(() => String)
  username: string;
}
