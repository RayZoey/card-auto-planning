/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Ray lighthouseinmind@yeah.net
 * @LastEditTime: 2025-08-22 15:51:21
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
import { PlatfromTaskGroupService } from './task-group.service';

@Controller('platform-task-group')
export class PlatfromTaskGroupController {
  constructor(private readonly service: PlatfromTaskGroupService, private offsetCalculator: OffsetCalculator) {}

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

  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async create(@Res() response: Response, @Body('name') name: string) {
    const res = await this.service.create(name);
    response.status(HttpStatus.CREATED).send({
      code: HttpStatus.CREATED,
      data: res,
      res: '成功',
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async update(@Param('id') id: number, @Body('name') name: string, @Res() response: Response) {
    const res = await this.service.update(id, name);
    response.status(HttpStatus.OK).send({
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async delete(@Param('id') id: number, @Res() response: Response) {
    await this.service.delete(id);
    response.status(HttpStatus.OK).send({
      code: HttpStatus.OK,
      res: '成功',
    });
  }
}
