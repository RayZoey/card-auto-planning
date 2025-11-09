import {Expose, Type} from 'class-transformer';

export class PlatformPlanTemplateCreateDto {

  @Expose({name: 'name'})
  @Type(() => String)
  name: string;

  @Expose({name: 'total_days'})
  @Type(() => Number)
  totalDays: number;

  @Expose({name: 'remark'})
  @Type(() => String)
  remark: string;

  @Expose({name: 'detail'})
  @Type(() => Array)
  detail: any[];
}
