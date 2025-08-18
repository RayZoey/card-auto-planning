/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Ray lighthouseinmind@yeah.net
 * @LastEditTime: 2025-08-18 15:53:23
 * @FilePath: /card-backend/src/card/pdf-print-info/pdf-print-info.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {BaseService} from '@src/base/base.service';
import {QueryFilter} from '@src/common/query-filter';
import {QueryConditionParser} from '@src/common/query-condition-parser';
import { PlanTemplateCreateDto } from './plan-template.create.dto';
import { PlanTemplateUpdateDto } from './plan-template.update.dto';
import { PlanTemplateQueryCondition } from './plan-template.query-condition';

@Injectable()
export class PlanTemplateService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly baseService: BaseService,
    private readonly queryConditionParser: QueryConditionParser
  ) {}

  async findAll(queryCondition: PlanTemplateQueryCondition, offset: number, limit: number) {
    const filter: QueryFilter = this.queryConditionParser.parse(queryCondition);
    return this.prismaService.planTemplate.findMany({
      orderBy: {
        id: 'desc',
      },
      where: filter,
      skip: offset,
      take: limit,
    });
  }

  async findTotal(queryCondition: PlanTemplateQueryCondition): Promise<number> {
    const filter: QueryFilter = this.queryConditionParser.parse(queryCondition);
    return this.prismaService.planTemplate.count(
        {
          where: filter,
        }
    );
  }

  async create(dto: PlanTemplateCreateDto) {
    return this.prismaService.planTemplate.create({
      data: {
        name: dto.name,
        total_time: dto.totalTime,
        remark: dto.remark,
        total_use: 0
      }
    });
  }

  async update(id: number, dto: PlanTemplateUpdateDto) {
    const template = await this.prismaService.planTemplate.findFirst({
      where: {
        id
      }
    });
    if (!template){
      throw new Error('未找到该计划模版信息');
    }
    return this.prismaService.planTemplate.update({
      data: dto,
      where: {
        id: id,
      },
    });
  }

  async delete(id: number) {
  }
}
