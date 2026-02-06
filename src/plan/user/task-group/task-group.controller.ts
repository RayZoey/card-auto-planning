/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-02-06 12:07:56
 * @FilePath: /card-auto-planning/src/plan/platform/plan-template/plan-template.controller.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, Query, Req, Res, UseGuards} from '@nestjs/common';
import {OffsetCalculator} from '@src/common/offset-calculator';
import {JwtAuthGuard} from '@src/auth/jwt-auth.guard';
import {PaginationDto} from '@src/common/pagination.dto';
import {CollectionResource} from '@src/common/collection-resource';
import {Response} from 'express';
import { RoleGuard } from '@src/auth/role.guard';
import { UserTaskGroupService } from './task-group.service';

@Controller('user-task-group')
export class UserTaskGroupController {
  constructor(private readonly service: UserTaskGroupService, private offsetCalculator: OffsetCalculator) {}

  @Get()
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async list(@Req() request: Request, @Query('plan_id') planId: number) {
    const data = await this.service.findAll(planId);
    return {                                     
      code: HttpStatus.CREATED,
      data: data,
      res: '成功',
    }; 
  }


  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async create(@Req() req, @Body('name') name: string, @Body('plan_id') planId: number ) {
    const userId = req.user.accountId;
    const res = await this.service.create(planId, userId, name);
    return {                                     
      code: HttpStatus.CREATED,
      data: res,
      res: '成功',
    }; 
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async update(@Req() req, @Param('id') id: number, @Body('name') name: string, @Body('background') background: string) {
    const userId = req.user.accountId;
    const res = await this.service.updateTaskGroup(Number(id), name, background, userId);
    return {
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    };
  }
}
