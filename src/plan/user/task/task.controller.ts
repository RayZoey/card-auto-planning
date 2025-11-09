/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-11-09 22:00:25
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
import { UserTaskService } from './task.service';
import { UserTaskQueryCondition } from './task.query-condition';
import { UserTaskQuery } from './task.query';
import { UserTaskCreateDto } from './task.create.dto';
import { UserTaskUpdateDto } from './task.update.dto';
import { TaskStatus } from '@prisma/client';

@Controller('user-task')
export class UserTaskController {
  constructor(private readonly service: UserTaskService, private offsetCalculator: OffsetCalculator) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async findById(@Req() req, @Param('id') id: number) {
    const res = await this.service.findById(id);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    };  
  }
  
  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async create(@Req() req, @Body() createDto: UserTaskCreateDto) {
    const userId = req.user.accountId;
    const res = await this.service.create(userId, createDto);
    return {                                     
      code: HttpStatus.CREATED,
      data: res,
      res: '成功',
    }; 
  }

  //  心跳接口
  @Put('heartbeat/:id')
  async heartbeat(@Req() req, @Param('id') id: number) {
    const userId = req.user.accountId;
    const res = await this.service.heartbeat(id, userId);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }

  // 学习状态反馈
  @Put('/change-status/:id')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async changeTaskStatus(@Req() req, @Param('id') id: number, @Body('status') status: TaskStatus) {
    const userId = req.user.accountId;
    const res = await this.service.changeTaskStatus(id, status, userId);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async update(@Req() req, @Param('id') id: number, @Body() updateDto: UserTaskUpdateDto) {
    const userId = req.user.accountId;
    const res = await this.service.update(id, updateDto, userId);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async delete(@Param('id') id: number, @Body('need_auto_plan') needAutoPlan: boolean) {
    const res = await this.service.delete(id, needAutoPlan);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }
}
