/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-11-09 16:42:26
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
import { UserPlanService } from './plan.service';
import { UserPlanQuery } from './plan.query';
import { UserPlanQueryCondition } from './plan.query-condition';
import { UserPlanCreateDto } from './plan.create.dto';
import { UserPlanUpdateDto } from './plan.update.dto';

@Controller('user-plan')
export class UserPlanController {
  constructor(private readonly service: UserPlanService, private offsetCalculator: OffsetCalculator) {}

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

  @Get()
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async list(@Req() req, @Query() pagination: PaginationDto, @Query() queryDto: UserPlanQuery) {
    const offset = this.offsetCalculator.calculate(pagination.page, pagination.pageSize);
    const limit = pagination.pageSize;
    const queryCondition = new UserPlanQueryCondition();
    queryCondition.id = queryDto.id;
    queryCondition.name = queryDto.name;
    queryCondition.status = queryDto.status;

    queryCondition.userId = req.user.accountId; //  过滤当前用户

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

  //  使用平台模版生成用户计划
  @Post('generate-by-template/:templateId')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async generateByTemplate(@Req() req, @Param('templateId') templateId: number) {
    const userId = req.user.accountId;
    const res = await this.service.generateByTemplate(userId, templateId);
    return {                                     
      code: HttpStatus.CREATED,
      data: res,
      res: '成功',
    }; 
  }
  
  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async create(@Req() req, @Body() createDto: UserPlanCreateDto) {
    const userId = req.user.accountId;
    const res = await this.service.create(userId, createDto);
    return {                                     
      code: HttpStatus.CREATED,
      data: res,
      res: '成功',
    }; 
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async update(@Req() req, @Param('id') id: number, @Body() updateDto: UserPlanUpdateDto) {
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
  async delete(@Param('id') id: number) {
    const res = await this.service.delete(id);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }
}
