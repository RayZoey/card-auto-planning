/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-02-11 23:36:46
 * @FilePath: /card-auto-planning/src/plan/platform/plan-template/plan-template.controller.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Query, Req, Res, UseGuards} from '@nestjs/common';
import {OffsetCalculator} from '@src/common/offset-calculator';
import {JwtAuthGuard} from '@src/auth/jwt-auth.guard';
import {PaginationDto} from '@src/common/pagination.dto';
import {CollectionResource} from '@src/common/collection-resource';
import { RoleGuard } from '@src/auth/role.guard';
import { UserPlanQuery } from './plan.query';
import { UserPlanQueryCondition } from './plan.query-condition';
import { UserPlanCreateDto } from './plan.create.dto';
import { UserPlanUpdateDto } from './plan.update.dto';
import { AdminUserPlanService } from './plan.service';

@Controller('admin/user-plan')
export class AdminUserPlanController {
  constructor(private readonly service: AdminUserPlanService, private offsetCalculator: OffsetCalculator) {}

  //  获取下一个计划日可提前任务列表
  @Get('/tasks/next-advance/list/:planId')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async getNextAdvanceTaskList(@Req() req, @Body('mini_user_id') userId: number, @Param('planId') planId: number, @Query('current_date_no') currentDateNo: number) {
    const res = await this.service.getNextAdvanceTaskList(userId, planId, currentDateNo);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }

  @Get('/tasks/latest-uncompleted/:planId')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async getLatestUncompletedTasks(@Req() req, @Body('mini_user_id') userId: number, @Param('planId') planId: number) {
    const res = await this.service.getLatestUncompletedTasks(userId, planId);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }

  //  获取某计划中历史日期的任务情况
  @Get('/tasks/history-plan-day/:planId')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async getHistoryPlanDay(@Req() req, @Param('planId') planId: number, @Query('date') date: string) {
    const res = await this.service.getHistoryPlanDay(planId, date);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }
  //  获取某计划中指定计划日的任务列表
  @Get('/tasks/future-plan-day/:planId')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async getFuturePlanDay(@Req() req, @Param('planId') planId: number, @Query('dateNo') dateNo: number) {
    const res = await this.service.getFuturePlanDay(planId, dateNo);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
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
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async changeTemplate(@Req() req,  @Body('mini_user_id') userId: number, @Param('planId') planId: number, @Body('new_template_id') newTemplateId: number) {
    const res = await this.service.changeTemplate(userId, planId, newTemplateId);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }

    //  修改每日时长限制
    @Put('/day-limit-hour/:planId')
    @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
    async changeDayLimitHour(
      @Req() req, 
      @Body('mini_user_id') userId: number,
      @Param('planId') planId: number, 
      @Body('date_no') dateNo: number, 
      @Body('min_time') minTime: number,
      @Body('apply_to_future') applyToFuture: boolean = false
    ) {
      const res = await this.service.changeDayLimitHour(userId, planId, dateNo, minTime, applyToFuture);
      return {                                     
        code: HttpStatus.OK,
        data: res,
        res: '成功',
      }; 
    }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Req() req, @Query() pagination: PaginationDto, @Query() queryDto: UserPlanQuery) {
    const offset = this.offsetCalculator.calculate(pagination.page, pagination.pageSize);
    const limit = pagination.pageSize;
    const queryCondition = new UserPlanQueryCondition();
    queryCondition.id = queryDto.id;
    queryCondition.name = queryDto.name;
    queryCondition.status = queryDto.status;

    if (req.user.client_credentials === 'miniUser'){
      queryCondition.userId = req.user.accountId; //  过滤当前用户
    }
    if (req.user.client_credentials === 'backUser' && queryDto.user_id !== undefined){
      queryCondition.userId = queryDto.user_id;
    }
    
    const data = await this.service.findAll(queryCondition, offset, limit, req.user.client_credentials);
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
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async generateByTemplate(@Req() req,  @Body('mini_user_id') userId: number, @Body('template_id') templateId: number, @Body('name') planName: string) {
    if (!templateId){
      throw new Error('模版id缺失')
    }
    const res = await this.service.generateByTemplate(userId, templateId, planName);
    return {                                     
      code: HttpStatus.CREATED,
      data: res,
      res: '成功',
    }; 
  }
  
  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async create(@Req() req,  @Body('mini_user_id') userId: number, @Body() createDto: UserPlanCreateDto) {
    const res = await this.service.create(userId, createDto);
    return {                                     
      code: HttpStatus.CREATED,
      data: res,
      res: '成功',
    }; 
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async update(@Req() req, @Param('id') id: number,  @Body('mini_user_id') userId: number, @Body() updateDto: UserPlanUpdateDto) {
    const res = await this.service.update(id, updateDto, userId);
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
