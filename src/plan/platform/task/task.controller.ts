/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-09-06 16:13:04
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
import { PlatformTaskService } from './task.service';
import { PlatformTaskUpdateDto } from './task.update.dto';
import { PlatformTaskCreateDto } from './task.create.dto';
import { PlatformTaskUpdateSortDto } from './task.update-sort.dto';
import { PlatformTaskQueryCondition } from './task.query-condition';
import { PlatformTaskQuery } from './task.query';

@Controller('platform-task')
export class PlatformTaskController {
  constructor(private readonly service: PlatformTaskService, private offsetCalculator: OffsetCalculator) {}

  @Get()
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async list(@Req() request: Request, @Query() pagination: PaginationDto, @Query() query: PlatformTaskQuery) {
    const offset = this.offsetCalculator.calculate(pagination.page, pagination.pageSize);
    const limit = pagination.pageSize;
    const queryCondition = new PlatformTaskQueryCondition();
    queryCondition.name = query.name;
    queryCondition.presetTaskTagId = query.presetTaskTagId;
    queryCondition.remark = query.remark;
    queryCondition.timingType = query.timingType;
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


  @Get(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async findById(@Param('id') id: number) {
    const res = await this.service.findById(id);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }

  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async create(@Body() dto: PlatformTaskCreateDto) {
    const res = await this.service.create(dto);
    return {                                     
      code: HttpStatus.CREATED,
      data: res,
      res: '成功',
    }; 
  }

  @Put('/baseinfo/:id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async update(@Param('id') id: number, @Body() dto: PlatformTaskUpdateDto) {
    const res = await this.service.update(id, dto);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }

  @Put('group-sort/:id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async updateGroupSort(@Param('id') id: number, @Body() dto: PlatformTaskUpdateSortDto) {
    const res = await this.service.updateGroupSort(id, dto.groupSort);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async delete(@Param('id') id: number) {
    const res = await this.service.delete(id);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }
}
