/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-11-09 16:44:18
 * @FilePath: /card-backend/src/card/pdf-print-info/pdf-print-info.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {BaseService} from '@src/base/base.service';
import {QueryFilter} from '@src/common/query-filter';
import {QueryConditionParser} from '@src/common/query-condition-parser';
import { PlatformPlanTemplateQueryCondition } from './plan-template.query-condition';
import { PlatformPlanTemplateCreateDto } from './plan-template.create.dto';
import { PlatformPlanTemplateUpdateDto } from './plan-template.update.dto';
const _ = require('lodash');

@Injectable()
export class PlatformPlanTemplateService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly baseService: BaseService,
    private readonly queryConditionParser: QueryConditionParser
  ) {}

  async findAll(queryCondition: PlatformPlanTemplateQueryCondition, offset: number, limit: number) {
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

  async findTotal(queryCondition: PlatformPlanTemplateQueryCondition): Promise<number> {
    const filter: QueryFilter = this.queryConditionParser.parse(queryCondition);
    return this.prismaService.planTemplate.count(
        {
          where: filter,
        }
    );
  }

  async findById(id){
    return this.prismaService.planTemplate.findFirst({
      where: {
        id: id
      },
      include: {
        PlanTemplateDetail: true
      }
    });
  }

  //  创建任务模版
  async create(dto: PlatformPlanTemplateCreateDto) {
    const record = await this.prismaService.planTemplate.findFirst({
      where: {
        name: dto.name
      }
    });
    if (record){
      throw new Error('该计划模版名称已存在');
    }
    return await this.prismaService.$transaction(async (prismaService) => {
      const template = await prismaService.planTemplate.create({
        data: {
          name: dto.name,
          total_days: dto.totalDays,
          remark: dto.remark,
          total_use: 0
        },
      });
      await this.createDetail(prismaService, template.id, dto.detail);
    });
  }

  //  更新任务模版基础信息
  async updateBaseInfo(id: number, dto: PlatformPlanTemplateUpdateDto) {
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

  //  更新任务模版日历信息
  async updateDateDetailInfo(id: number, detail: any[]) {
    const template = await this.prismaService.planTemplate.findFirst({
      where: {
        id
      }
    });
    if (!template){
      throw new Error('未找到该计划模版信息');
    }
    return await this.prismaService.$transaction(async (prismaService) => {
      await prismaService.planTemplateDetail.deleteMany({
        where: {
          id: id
        }
      });
      await this.createDetail(prismaService, id, detail);
    })
  }

  async createDetail(transactionPrismaService, templateId, detail){
    let globalSort = 1;
    for (const day in detail) {
      detail[day] = _.sortBy(detail[day], 'day_sort');  //  按照当日顺序排序避免传输后乱序
      for (const item of detail[day]) {
        await transactionPrismaService.planTemplateDetail.createMany({
          data: {...item, global_sort: globalSort++, plan_template_id: templateId},
        });
      }
    }
  }

  async delete(id: number) {
  }

}
