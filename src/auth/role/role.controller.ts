import {Controller, Get, Post, Query, Body, Res, Put, Param, HttpStatus, Delete, UseGuards} from '@nestjs/common';
import {CollectionResource} from '@src/common/collection-resource';
import {PaginationDto} from '@src/common/pagination.dto';
import {OffsetCalculator} from '@src/common/offset-calculator';
import {Response} from 'express';
import {RoleService} from '@src/auth/role/role.service';
import {RoleCreateDto} from '@src/auth/role/role.create.dto';
import {RoleUpdateDto} from '@src/auth/role/role.update.dto';
import {ResourceService} from '@src/auth/resouce/resource.service';
import {ResourceDto} from '@src/auth/resouce/resource.dto';
import {JwtAuthGuard} from '@src/auth/jwt-auth.guard';

@Controller('role')
export class RoleController {
  constructor(
    private readonly service: RoleService,
    private readonly resourceService: ResourceService,
    private offsetCalculator: OffsetCalculator
  ) {}

  @Get()
  async list(@Query() pagination: PaginationDto) {
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
  @UseGuards(JwtAuthGuard)
  async create(@Res() response: Response, @Body() createDto: RoleCreateDto) {
    await this.service.create(createDto);
    response.status(HttpStatus.CREATED).send({
      code: HttpStatus.CREATED,
      res: '成功',
    });
  }

  /**
   * 获取角色详情(关联权限)
   * @param id
   * @returns
   */
  @Get('/:id')
  @UseGuards(JwtAuthGuard)
  async findById(@Param('id') id: number) {
    // return await this.service.findById(id);
  }

  /**
   * 追加权限给角色
   * @param response
   * @param id
   * @param dto
   */
  @Post('/resource-author/:id')
  @UseGuards(JwtAuthGuard)
  async resourceAuthor(@Res() response: Response, @Param('id') id: number, @Body() dto: ResourceDto[]) {
    // await this.resourceService.resourceAuthor(id, dto);
    response.status(HttpStatus.CREATED).send({
      code: HttpStatus.CREATED,
      res: '成功',
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: number, @Res() response: Response, @Body() updateDto: RoleUpdateDto) {
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
}
