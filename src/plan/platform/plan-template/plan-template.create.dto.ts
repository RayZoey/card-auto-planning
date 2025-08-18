import {Expose, Type} from 'class-transformer';

export class PlanTemplateCreateDto {

  @Expose({name: 'name'})
  @Type(() => String)
  name: string;

  @Expose({name: 'total_time'})
  @Type(() => Number)
  totalTime: number;

  @Expose({name: 'remark'})
  @Type(() => String)
  remark: string;
}
