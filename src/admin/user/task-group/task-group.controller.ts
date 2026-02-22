/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-02-22 18:16:09
 * @FilePath: /card-auto-planning/src/plan/platform/plan-template/plan-template.controller.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, Query, Req, Res, UseGuards} from '@nestjs/common';
import {OffsetCalculator} from '@src/common/offset-calculator';
import {JwtAuthGuard} from '@src/auth/jwt-auth.guard';
import { RoleGuard } from '@src/auth/role.guard';
import { AdminUserTaskGroupService } from './task-group.service';

@Controller('admin/user-task-group')
export class AdminUserTaskGroupController {
  constructor(private readonly service: AdminUserTaskGroupService, private offsetCalculator: OffsetCalculator) {}

  @Get()
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async list(@Req() request: Request, @Query('plan_id') planId: number) {
    const data = await this.service.findAll(planId);
    return {                                     
      code: HttpStatus.CREATED,
      data: data,
      res: '成功',
    }; 
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async update(@Req() req, @Param('id') id: number, @Body('mini_user_id') userId: number, @Body('name') name: string, @Body('background') background: string) {
    const res = await this.service.updateTaskGroup(Number(id), name, background, userId);
    return {
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    };
  }

  /** 复制平台任务集：传入新名字和要复制的平台任务集 id，创建新任务集并复制其下所有任务 */
  @Post('copy-from-platform')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async copyFromPlatform(
    @Body('name') name: string,
    @Body('source_task_group_id') sourceTaskGroupId: number,
  ) {
    const data = await this.service.copyFromPlatformTaskGroup(name, Number(sourceTaskGroupId));
    return {
      code: HttpStatus.CREATED,
      data,
      res: '成功',
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async create(@Req() req, @Body('name') name: string, @Body('mini_user_id') userId: number, @Body('plan_id') planId: number ) {
    const res = await this.service.create(planId, userId, name);
    return {                                     
      code: HttpStatus.CREATED,
      data: res,
      res: '成功',
    }; 
  }
}
