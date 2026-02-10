/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-12-24 00:03:17
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
import { PresetTaskTagService } from './preset-task-tag.service';

@Controller('preset-task-tag')
export class PresetTaskTagController {
  constructor(private readonly service: PresetTaskTagService, private offsetCalculator: OffsetCalculator) {}

  @Get()
  @UseGuards(JwtAuthGuard)
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
  // 新增标签
  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async create(@Body('tag_name') tagName: string, @Body('tag_icon') tagIcon: string) {
    const res = await this.service.create(tagName, tagIcon);
    return {                                     
      code: HttpStatus.CREATED,
      data: res,
      res: '标签创建成功',
    }; 
  }

  //  更新标签
  @Put(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async update(@Param('id') id: number, @Body('tag_name') tagName: string, @Body('tag_icon') tagIcon: string) {
    const res = await this.service.update(id, tagName, tagIcon);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '标签更新成功',
    }; 
  }

  //  删除标签
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
