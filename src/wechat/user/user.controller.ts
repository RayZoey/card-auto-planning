/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-04-14 10:51:15
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-08-29 00:34:13
 * @FilePath: /water/src/wechat/user/user.controller.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Controller, Get, Post, Query, Body, Res, Put, Param, HttpStatus, DefaultValuePipe, UseGuards, Req} from '@nestjs/common';
import {CollectionResource} from '@src/common/collection-resource';
import {PaginationDto} from '@src/common/pagination.dto';
import {OffsetCalculator} from '@src/common/offset-calculator';
import {Response} from 'express';
import {UserService} from './user.service';
import {UserUpdateDto} from './user.update.dto';
import {UserQuery} from './user.query';
import {UserQueryCondition} from './user.query-condition';
import {JwtAuthGuard} from '@src/auth/jwt-auth.guard';
import { RoleGuard } from '@src/auth/role.guard';

@Controller('wechat')
export class UserController {
  constructor(
    private readonly service: UserService,
    private offsetCalculator: OffsetCalculator
  ) {}

  @Get('/mini-user')
  async list(@Query() pagination: PaginationDto, @Query() queryDto: UserQuery) {
    const offset = this.offsetCalculator.calculate(pagination.page, pagination.pageSize);
    const limit = pagination.pageSize;
    const queryCondition = new UserQueryCondition();
    queryCondition.username = queryDto.username;
    queryCondition.phone = queryDto.phone;
    queryCondition.createdAtBegin = queryDto.createdAtBegin;
    queryCondition.createdAtEnd = queryDto.createdAtEnd;

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
  
  @Put('/mini-user')
  @UseGuards(JwtAuthGuard)
  async update(@Req() req, @Res() response: Response, @Body() updateDto: UserUpdateDto) {
    const userId = req.user.accountId;
    await this.service.update(userId, updateDto);
    response.status(HttpStatus.CREATED).send({
      code: HttpStatus.CREATED,
      res: '成功',
    });
  }

  //  绑定小程序用户督学服务导师
  @Post('/mini-user/bind-teacher')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async bindTeacher(
    @Req() req, 
    @Res() response: Response,
    @Body('teacher_id') teacherId: number,
    @Body('days') days: number,
  ) {
    const userId = req.user.accountId;
    const res = await this.service.bindTeacher(userId, teacherId, days);
    response.status(HttpStatus.CREATED).send(res);
  }

  @Post('/mini-user/login')
  async getOpenId(
    @Res() response: Response,
    @Body('code', new DefaultValuePipe(undefined)) code: string
  ) {
    const res = await this.service.getOpenIdAndCheckUserRecord(code);
    response.status(HttpStatus.CREATED).send(res);
  }

  @Post('/mini-user/phone')
  @UseGuards(JwtAuthGuard)
  async setMobile(@Req() req, @Res() response: Response, @Body('code', new DefaultValuePipe(undefined)) code: string) {
    const userId = req.user.accountId;
    const res = await this.service.setMobile(userId, code);
    response.status(HttpStatus.CREATED).send(res);
  }

  @Get('/current-mini-user')
  @UseGuards(JwtAuthGuard)
  async findById(@Req() req, @Res() response: Response) {
    const userId = req.user.accountId;
    const r = await this.service.findById(userId);
    response.status(HttpStatus.OK).send({
      code: HttpStatus.OK,
      data: r,
      res: '成功',
    });
  }

}
