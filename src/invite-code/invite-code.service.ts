import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/common/prisma.service';
import { InviteCodeStatus } from '@prisma/client';

@Injectable()
export class InviteCodeService {
  constructor(private readonly prisma: PrismaService) {}

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

