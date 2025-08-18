import {Expose, Type} from 'class-transformer';

export class PlanTemplateUpdateDto {

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
