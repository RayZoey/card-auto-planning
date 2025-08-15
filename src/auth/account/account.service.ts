/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-04-30 09:14:13
 * @LastEditors: Ray lighthouseinmind@yeah.net
 * @LastEditTime: 2025-07-21 14:06:55
 * @FilePath: /water/src/auth/account/account.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Injectable, UnauthorizedException, BadRequestException} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {AccountCreateDto} from '@src/auth/account/account.create.dto';
import {AccountUpdateDto} from '@src/auth/account/account.update.dto';
import {BaseService} from '@src/base/base.service';
import {QueryFilter} from '@src/common/query-filter';
import {QueryConditionParser} from '@src/common/query-condition-parser';
import {AccountQueryCondition} from '@src/auth/account/account.query-condition';

@Injectable()
export class AccountService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly baseService: BaseService,
    private readonly queryConditionParser: QueryConditionParser
  ) {}

  async findAll(queryCondition: AccountQueryCondition, offset: number, limit: number) {
    const filter: QueryFilter = this.queryConditionParser.parse(queryCondition);
    return this.prismaService.account.findMany({
      select: {
        id: true,
        username: true,
        display_name: true,
        latest_login_ip: true,
        latest_login_time: true,
        is_locked: true,
        role_id: true,
        role: true,
        created_at: true,
      },
      where: filter,
      orderBy: {
        id: 'desc',
      },
      skip: offset,
      take: limit,
    });
  }

  async findTotal(queryCondition: AccountQueryCondition): Promise<number> {
    const filter: QueryFilter = this.queryConditionParser.parse(queryCondition);
    return this.prismaService.account.count({
      where: filter,
    });
  }

  async create(createDto: AccountCreateDto) {
    createDto.role_id = 1;
    const account = await this.prismaService.account.findFirst({
      where: {
        username: createDto.username,
      },
    });
    if (account) {
      throw new Error('用户名已存在');
    }
    createDto.password = await this.baseService.encryption(createDto.password);
    return this.prismaService.account.create({
      data: createDto,
    });
  }

  async login(id: number, ip: string) {
    return this.prismaService.account.update({
      where: {
        id,
      },
      data: {
        latest_login_ip: ip,
        latest_login_time: new Date(),
      },
    });
  }

  async validateAccountStatus(accountId: number) {
    const account = await this.prismaService.account.findFirst({
      where: {
        id: accountId,
      },
    });
    if (!account) {
      throw new UnauthorizedException('用户不存在');
    }
    if (account.is_locked) {
      throw new UnauthorizedException('该后台用户已被锁定');
    }
  }

  async validateAccount(username: string, password: string, clientCredentials: 'backUser' | 'miniUser') {
    if (clientCredentials == 'backUser') {
      const account = await this.prismaService.account.findUnique({
        where: {
          username: username,
        },
        select: {
          id: true,
          username: true,
          display_name: true,
          role: {
            select: {
              id: true,
              name: true,
              RolePermissionRelation: {
                select: {
                  permission_id: true,
                  permission: {
                    select: {
                      name: true,
                      permission_type: true,
                    },
                  },
                },
              },
            },
          },
          password: true,
          is_locked: true,
        },
      });
      if (account && !account.is_locked) {
        const roleInfo = {
          role: {
            id: account.role.id,
            name: account.role.name,
          },
          permission_list: account.role.RolePermissionRelation,
        };
        password = await this.baseService.encryption(password);
        if (password == account.password) {
          return {
            username: account.username,
            display_name: account.display_name,
            user_id: account.id,
            client_credentials: clientCredentials,
            open_id: null,
            role_info: roleInfo,
            // role: account.role,
          };
        }
      } else {
        throw new UnauthorizedException('该后台用户已被锁定');
      }
    } else if (clientCredentials == 'miniUser') {
      const user = await this.prismaService.user.findFirst({
        where: {
          open_id: username,
        },
        select: {
          id: true,
          username: true,
          open_id: true,
        },
      });

      return {
        username: user.username,
        display_name: user.username,
        user_id: user.id,
        client_credentials: clientCredentials,
        open_id: user.open_id,
        role_info: null,
        // role: account.role,
      };
    }
  }

  async changePassword(id: number, newPassword: string) {
    return this.prismaService.account.update({
      where: {
        id,
      },
      data: {
        password: await this.baseService.encryption(newPassword),
      },
    });
  }

  async update(id: number, updateDto: AccountUpdateDto) {
    const account = await this.prismaService.account.findFirst({
      where: {
        username: updateDto.username,
        id: {
          not: id,
        },
      },
    });
    if (account) {
      throw new Error('用户名已存在');
    }
    if (updateDto.password) {
      updateDto.password = await this.baseService.encryption(updateDto.password);
    }
    return this.prismaService.account.update({
      data: updateDto,
      where: {
        id,
      },
    });
  }

  async delete(id: number) {
    return this.prismaService.account.delete({
      where: {
        id,
      },
    });
  }

  async findById(id: number) {
    const account = await this.prismaService.account.findFirst({
      include: {
        role: {
          select: {
            name: true,
            RolePermissionRelation: {
              select: {
                permission_id: true,
                permission: {
                  select: {
                    name: true,
                    permission_type: true,
                  },
                },
                role_id: true,
              },
            },
          },
        },
      },
      where: {
        id,
      },
    });
    if (account) {
      delete account.password;
    }
    return account;
  }

  async lock(id: number) {
    await this.prismaService.account.update({
      where: {
        id,
      },
      data: {
        is_locked: true,
      },
    });
  }

  async unlock(id: number) {
    await this.prismaService.account.update({
      where: {
        id,
      },
      data: {
        is_locked: false,
      },
    });
  }
  
}
