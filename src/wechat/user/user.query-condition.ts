/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-04-14 10:51:15
 * @LastEditors: Ray lighthouseinmind@yeah.net
 * @LastEditTime: 2025-05-15 15:20:59
 * @FilePath: /card/src/wechat/user/user.query-condition.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Column, Operation} from '@src/common/query-object.decorator';
import {Expose, Type} from 'class-transformer';

export class UserQueryCondition {
  @Column('username')
  @Operation('equals')
  public username: string;

  @Column('phone')
  @Operation('equals')
  public phone: string;
  
  @Column('created_at')
  @Operation('gte')
  public createdAtBegin: Date;

  @Column('created_at')
  @Operation('lte')
  public createdAtEnd: Date;
}
