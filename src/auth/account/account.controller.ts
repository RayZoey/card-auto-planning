import {Controller, Get, Post, Query, Body, Res, Put, Param, HttpStatus, Req, UseGuards, Delete, BadRequestException} from '@nestjs/common';
import {CollectionResource} from '@src/common/collection-resource';
import {PaginationDto} from '@src/common/pagination.dto';
import {OffsetCalculator} from '@src/common/offset-calculator';
import {Response} from 'express';
import {AccountService} from '@src/auth/account/account.service';
import {AccountUpdateDto} from '@src/auth/account/account.update.dto';
import {AccountCreateDto} from '@src/auth/account/account.create.dto';
import {AccountQueryCondition} from '@src/auth/account/account.query-condition';
import {AccountQuery} from '@src/auth/account/account.query';
import {JwtAuthGuard} from '@src/auth/jwt-auth.guard';

@Controller('account')
export class AccountController {
  constructor(
    private readonly service: AccountService,
    private offsetCalculator: OffsetCalculator
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Query() pagination: PaginationDto, @Query() queryDto: AccountQuery) {
    const offset = this.offsetCalculator.calculate(pagination.page, pagination.pageSize);
    const queryCondition = new AccountQueryCondition();
    queryCondition.username = queryDto.username;
    const limit = pagination.pageSize;
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

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Res() response: Response, @Body() createDto: AccountCreateDto) {
    await this.service.create(createDto);
    response.status(HttpStatus.CREATED).send({
      code: HttpStatus.CREATED,
      res: '成功',
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: number, @Res() response: Response, @Body() updateDto: AccountUpdateDto) {
    await this.service.update(id, updateDto);
    response.status(HttpStatus.CREATED).send({
      code: HttpStatus.CREATED,
      res: '成功',
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: number, @Res() response: Response) {
    await this.service.delete(id);
    response.status(HttpStatus.NO_CONTENT).send({
      code: HttpStatus.NO_CONTENT,
      res: '成功',
    });
  }

  @Put('/:id/password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Res() response: Response, @Param('id') id: number, @Body('new_password') newPassword: string) {
    await this.service.changePassword(id, newPassword);
    response.status(HttpStatus.CREATED).send({
      code: HttpStatus.CREATED,
      res: '成功',
    });
  }


  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Req() request, @Param('id') id: number) {
    return await this.service.findById(id);
  }

  @Post('/:id/lock')
  @UseGuards(JwtAuthGuard)
  async lock(@Res() response: Response, @Param('id') id: number) {
    await this.service.lock(id);
    response.status(HttpStatus.CREATED).send({
      code: HttpStatus.CREATED,
      res: '成功',
    });
  }

  @Post('/:id/unlock')
  @UseGuards(JwtAuthGuard)
  async unlock(@Res() response: Response, @Param('id') id: number) {
    await this.service.unlock(id);
    response.status(HttpStatus.CREATED).send({
      code: HttpStatus.CREATED,
      res: '成功',
    });
  }
}
