import {Column, Operation} from '@src/common/query-object.decorator';

export class AccountQueryCondition {

  @Column('role_id')
  @Operation('equals')
  public roleId: number;

  @Column('username')
  @Operation('equals')
  public username: string;

}
