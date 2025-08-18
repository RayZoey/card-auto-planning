
import {Expose, Type} from 'class-transformer';

export class PlanTemplateQuery {
  @Expose({name: 'id'})
  @Type(() => Number)
  id: number;

  @Expose({name: 'name'})
  @Type(() => String)
  name: string;

}
