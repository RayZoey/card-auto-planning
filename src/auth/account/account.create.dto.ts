import {Expose, Type} from 'class-transformer';

export class AccountCreateDto {
  @Expose({name: 'username'})
  @Type(() => String)
  username: string;

  @Expose({name: 'display_name'})
  @Type(() => String)
  display_name: string;

  @Expose({name: 'password'})
  @Type(() => String)
  password: string;

  @Expose({name: 'latest_login_ip'})
  @Type(() => String)
  latest_login_ip: string;

  @Expose({name: 'latest_login_time'})
  @Type(() => Date)
  latest_login_time: Date;

  @Expose({name: 'role_id'})
  @Type(() => Number)
  role_id: number;

  @Expose({name: 'is_locked'})
  @Type(() => Boolean)
  is_locked: boolean;
}
