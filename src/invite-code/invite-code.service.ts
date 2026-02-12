/*
 * @Author: Reflection lighthouseinmind@yeah.net
 * @Date: 2026-02-04 21:44:27
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-02-08 17:07:57
 * @FilePath: /card-auto-planning/src/invite-code/invite-code.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/common/prisma.service';
import { InviteCodeStatus } from '@prisma/client';
import { InviteCodeQueryCondition } from './invit-code.query-condition';
import { QueryConditionParser } from '@src/common/query-condition-parser';
import { QueryFilter } from '@src/common/query-filter';

@Injectable()
export class InviteCodeService {
  constructor(private readonly prisma: PrismaService, private readonly queryConditionParser: QueryConditionParser) {}

  async findAll(queryCondition: InviteCodeQueryCondition, offset: number, limit: number) {
    const filter: QueryFilter = this.queryConditionParser.parse(queryCondition);
    return this.prisma.inviteCode.findMany({
      skip: offset,
      take: limit,
      orderBy: {
        id: 'desc',
      },
      include: {
        User: {
          select: {
            id: true,
            display_name: true,
            name: true,
            avatar: true,
          },
        },
      },
      where: filter,
    });
  }

  async findTotal(queryCondition: InviteCodeQueryCondition) {
    const filter: QueryFilter = this.queryConditionParser.parse(queryCondition);
    return this.prisma.inviteCode.count({
      where: filter,
    });
  }

  private generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async generateBatch(count: number) {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // 简单重试避免唯一键冲突
      let code = this.generateRandomCode();
      let retry = 0;
      // 最多重试 5 次
      while (retry < 5) {
        try {
          const created = await this.prisma.inviteCode.create({
            data: {
              code,
              status: InviteCodeStatus.ENABLE,
            },
          });
          codes.push(created.code);
          break;
        } catch (e) {
          // 可能是唯一键冲突，重新生成
          code = this.generateRandomCode();
          retry++;
        }
      }
    }
    return { codes };
  }

  async disable(code: string) {
    const invite = await this.prisma.inviteCode.findFirst({
      where: { code },
    });
    if (!invite) {
      throw new Error('邀请码不存在');
    }
    if (invite.status === InviteCodeStatus.USED) {
      throw new Error('邀请码已被使用，无法禁用');
    }
    await this.prisma.inviteCode.update({
      where: { id: invite.id },
      data: { status: InviteCodeStatus.DISABLE },
    });
    return { ok: true };
  }
}

