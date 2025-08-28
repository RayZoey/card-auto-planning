/*
 * @Author: Reflection lighthouseinmind@yeah.net
 * @Date: 2025-08-25 21:59:11
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-08-29 00:29:48
 * @FilePath: /card-auto-planning/src/teacher/teacher.controller.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Controller, Get, Query, DefaultValuePipe} from '@nestjs/common';
import {CollectionResource} from '@src/common/collection-resource';
import {PaginationDto} from '@src/common/pagination.dto';
import {OffsetCalculator} from '@src/common/offset-calculator';
import {TeacherService} from './teacher.service';
import { TeacherQueryCondition } from './teacher.query-condition';
import { TeacherQuery } from './teacher.query';

@Controller('teacher')
export class TeacherController {
  constructor(private readonly service: TeacherService, private offsetCalculator: OffsetCalculator) {}

  @Get()
  async list(@Query() pagination: PaginationDto, @Query() queryDto: TeacherQuery) {
    const offset = this.offsetCalculator.calculate(pagination.page, pagination.pageSize);
      const limit = pagination.pageSize;
      const queryCondition = new TeacherQueryCondition();
      queryCondition.id = queryDto.id;
      queryCondition.name = queryDto.name;
      queryCondition.is_enable = queryDto.is_enable;
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
}
