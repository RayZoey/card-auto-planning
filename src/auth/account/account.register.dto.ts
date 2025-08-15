import {IsString, Length, Matches} from 'class-validator';
import {Expose, Type} from 'class-transformer';

export class RegisterDto {
  @IsString()
  @Length(2, 40)
  @Expose({name: 'username'})
  @Type(() => String)
  username: string;

  @IsString()
  @Length(6, 20)
  @Expose({name: 'password'})
  @Type(() => String)
  password: string;

  @IsString()
  @Matches(/^1[3-9]\d{9}$/)
  @Expose({name: 'phone'})
  @Type(() => String)
  phone: string;

  @IsString()
  @Length(6, 6)
  @Expose({name: 'verification_code'})
  @Type(() => String)
  verification_code: string;
}
