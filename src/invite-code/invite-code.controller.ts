import { Body, Controller, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { InviteCodeService } from './invite-code.service';
import { JwtAuthGuard } from '@src/auth/jwt-auth.guard';
import { RoleGuard } from '@src/auth/role.guard';

@Controller('invite-code')
export class InviteCodeController {
  constructor(private readonly service: InviteCodeService) {}

  // 批量生成邀请码（仅后台使用）
  @Post('generate')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async generate(@Body('count') count: number = 1) {
    const res = await this.service.generateBatch(Number(count) || 1);
    return {
      code: HttpStatus.CREATED,
      data: res,
      res: '成功',
    };
  }

  // 禁用单个邀请码
  @Post('disable')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async disable(@Body('code') code: string) {
    const res = await this.service.disable(code);
    return {
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    };
  }
}

