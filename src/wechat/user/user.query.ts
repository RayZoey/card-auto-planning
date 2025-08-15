import {Expose, Type} from 'class-transformer';
import {ToArray, ToBoolean} from '@src/common/transformer/query-decorate.transformer';

export class UserQuery {
  @Expose({name: 'username'})
  @Type(() => String)
  username: string;

  @Expose({name: 'phone'})
  @Type(() => String)
  phone: string;

  @Expose({name: 'created_at_begin'})
  @Type(() => Date)
  createdAtBegin: Date;

  @Expose({name: 'created_at_end'})
  @Type(() => Date)
  createdAtEnd: Date;
}
