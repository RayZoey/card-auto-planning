
import { TaskTimingType } from '@prisma/client';
import {Expose, Type} from 'class-transformer';

export class PlatformTaskQuery {

  @Expose({name: 'name'})
  @Type(() => String)
  name: string;

  @Expose({name: 'preset_task_tag_id'})
  @Type(() => Number)
  presetTaskTagId: number;

  @Expose({name: 'remark'})
  @Type(() => String)
  remark: string;

  @Expose({name: 'timing_type'})
  @Type(() => String)
  timingType: TaskTimingType;
}
