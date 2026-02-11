/*
 * @Author: Reflection lighthouseinmind@yeah.net
 * @Date: 2026-02-04 21:44:54
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-02-11 23:10:58
 * @FilePath: /card-auto-planning/src/invite-code/invite-code.controller.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Body, Controller, Get, HttpStatus, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InviteCodeService } from './invite-code.service';
import { JwtAuthGuard } from '@src/auth/jwt-auth.guard';
import { RoleGuard } from '@src/auth/role.guard';
import { PaginationDto } from '@src/common/pagination.dto';
import { OffsetCalculator } from '@src/common/offset-calculator';
import { CollectionResource } from '@src/common/collection-resource';
import { InviteCodeQuery } from './invit-code.query';
import { InviteCodeQueryCondition } from './invit-code.query-condition';

@Controller('invite-code')
export class InviteCodeController {
  constructor(private readonly service: InviteCodeService, private offsetCalculator: OffsetCalculator) {}

  @Get()
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async list(@Req() request: Request, @Query() pagination: PaginationDto, @Query() queryDto: InviteCodeQuery) {
    const offset = this.offsetCalculator.calculate(pagination.page, pagination.pageSize);
    const limit = pagination.pageSize;
    const queryCondition = new InviteCodeQueryCondition();
    queryCondition.code = queryDto.code;
    queryCondition.status = queryDto.status;
    queryCondition.createdAtBegin = queryDto.createdAtBegin;
    queryCondition.createdAtEnd = queryDto.createdAtEnd;
    const data = await this.service.findAll(queryCondition, offset, limit);
    const total = await this.service.findTotal(queryCondition);
    const resource = new CollectionResource(data);
    resource.addMeta('pagination', {
      page_size: pagination.pageSize,
      current_page: pagination.page,
      total,
    });
    return resource;
  }

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

