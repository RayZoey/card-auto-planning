/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Ray lighthouseinmind@yeah.net
 * @LastEditTime: 2025-08-22 15:51:42
 * @FilePath: /card-auto-planning/src/plan/platform/plan-template/plan-template.update.dto.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Expose, Type} from 'class-transformer';

export class PlatfromPlanTemplateUpdateDto {

  @Expose({name: 'name'})
  @Type(() => String)
  name: string;

  @Expose({name: 'total_time'})
  @Type(() => Number)
  total_time: number;

  @Expose({name: 'remark'})
  @Type(() => String)
  remark: string;
  
}
