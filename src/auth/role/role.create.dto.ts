import {Expose, Type} from 'class-transformer';

export class RoleCreateDto {
  @Expose({name: 'name'})
  @Type(() => String)
  name: string;

  @Expose({name: 'desc'})
  @Type(() => String)
  desc: string;

  @Expose({name: 'is_locked'})
  @Type(() => Boolean)
  is_locked: boolean;
}
