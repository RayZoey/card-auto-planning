/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-02-06 12:08:39
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
import { PlatformTaskGroupService } from './task-group.service';

@Controller('platform-task-group')
export class PlatformTaskGroupController {
  constructor(private readonly service: PlatformTaskGroupService, private offsetCalculator: OffsetCalculator) {}

  @Get()
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async list(@Req() request: Request, @Query() pagination: PaginationDto) {
    const offset = this.offsetCalculator.calculate(pagination.page, pagination.pageSize);
    const limit = pagination.pageSize;
    const data = await this.service.findAll(offset, limit);
    const total = await this.service.findTotal();
    const resource = new CollectionResource(data);
    resource.addMeta('pagination', {
      page_size: pagination.pageSize,
      current_page: pagination.page,
      total,
    });
    return resource;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async findById(@Param('id') id: number) {
    const data = await this.service.findById(id);
    return {                                     
      code: HttpStatus.OK,
      data: data,
      res: '成功',
    }; 
  }

  //  管理任务与任务集
  @Post('connect-task/:id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async connectTask(@Param('id') id: number, @Body('task_ids') taskIds: []) {
    const res = await this.service.connectTask(id, taskIds);
    return {                                     
      code: HttpStatus.CREATED,
      data: res,
      res: '成功',
    }; 
  }

  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async create(@Body('name') name: string) {
    const res = await this.service.create(name);
    return {                                     
      code: HttpStatus.CREATED,
      data: res,
      res: '成功',
    }; 
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async update(@Param('id') id: number, @Body('name') name: string, @Body('background') background: string) {
    const res = await this.service.update(id, name, background);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async delete(@Param('id') id: number, @Res() response: Response) {
    const res = await this.service.delete(id);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }
}
