/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-01-18 23:46:47
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

  //  获取下一个计划日可提前任务列表
  @Get('/tasks/next-advance/list/:planId')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async getNextAdvanceTaskList(@Req() req, @Param('planId') planId: number, @Query('current_date_no') currentDateNo: number) {
    const res = await this.service.getNextAdvanceTaskList(req.user.accountId, planId, currentDateNo);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }


  @Get('/tasks/latest-uncompleted/:planId')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async getLatestUncompletedTasks(@Req() req, @Param('planId') planId: number) {
    const res = await this.service.getLatestUncompletedTasks(req.user.accountId, planId);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }

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

  //  用户切换模版
  @Put('/change-template/:planId')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async changeTemplate(@Req() req, @Param('planId') planId: number, @Body('new_template_id') newTemplateId: number) {
    const userId = req.user.accountId;
    const res = await this.service.changeTemplate(userId, planId, newTemplateId);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }

  //  修改每日时长限制
  @Put('/day-limit-hour/:planId')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async changeDayLimitHour(@Req() req, @Param('planId') planId: number, @Body('date_no') dateNo: number, @Body('min_time') minTime: number) {
    const userId = req.user.accountId;
    const res = await this.service.changeDayLimitHour(userId, planId, dateNo, minTime);
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
  @Post('generate-by-template')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async generateByTemplate(@Req() req, @Body('template_id') templateId: number, @Body('name') planName: string) {
    if (!templateId){
      throw new Error('模版id缺失')
    }
    const userId = req.user.accountId;
    const res = await this.service.generateByTemplate(userId, templateId, planName);
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
