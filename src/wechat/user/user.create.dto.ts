import {Expose, Type} from 'class-transformer';

export class UserCreateDto {
  @Expose({name: 'phone'})
  @Type(() => String)
  device_sn: string;
}
