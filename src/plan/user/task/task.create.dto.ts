/*
 * @Author: Reflection lighthouseinmind@yeah.net
 * @Date: 2025-08-27 22:21:49
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-09-04 19:44:21
 * @FilePath: /card-auto-planning/src/plan/user/plan/plan.create.dto.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { PlanStatus } from '@prisma/client';
import {Expose, Type} from 'class-transformer';

export class UserTaskCreateDto {

  @Expose({name: 'name'})
  @Type(() => String)
  name: string;

  @Expose({name: 'status'})
  @Type(() => String)
  status: PlanStatus;
}
