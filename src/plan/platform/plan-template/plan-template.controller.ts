/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-09-06 16:12:32
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
import { PlatformPlanTemplateService } from './plan-template.service';
import { PlatformPlanTemplateQuery } from './plan-template.query';
import { PlatformPlanTemplateQueryCondition } from './plan-template.query-condition';
import { PlatformPlanTemplateCreateDto } from './plan-template.create.dto';
import { PlatformPlanTemplateUpdateDto } from './plan-template.update.dto';

@Controller('platform-plan-template')
export class PlatformPlanTemplateController {
  constructor(private readonly service: PlatformPlanTemplateService, private offsetCalculator: OffsetCalculator) {}

  @Get()
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async list(@Req() request: Request, @Query() pagination: PaginationDto, @Query() queryDto: PlatformPlanTemplateQuery) {
    const offset = this.offsetCalculator.calculate(pagination.page, pagination.pageSize);
    const limit = pagination.pageSize;
    const queryCondition = new PlatformPlanTemplateQueryCondition();
    queryCondition.id = queryDto.id;
    queryCondition.name = queryDto.name;
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
  
  //  关联计划与平台任务集
  @Post('/connect-task-group/:planId')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async connectTaskGroup(@Param('planId') planId: number, @Body('group_ids') taskGroupArr: []) {
    const res = await this.service.connectTaskGroup(planId, taskGroupArr);
    return {                                     
      code: HttpStatus.CREATED,
      data: res,
      res: '成功',
    }; 
  }
  
  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async create(@Body() createDto: PlatformPlanTemplateCreateDto) {
    const res = await this.service.create(createDto);
    return {                                     
      code: HttpStatus.CREATED,
      data: res,
      res: '成功',
    }; 
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async update(@Param('id') id: number, @Body() updateDto: PlatformPlanTemplateUpdateDto) {
    const res = await this.service.update(id, updateDto);
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
