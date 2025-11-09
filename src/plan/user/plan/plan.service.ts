/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-11-09 16:42:25
 * @FilePath: /card-backend/src/card/pdf-print-info/pdf-print-info.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {BaseService} from '@src/base/base.service';
import {QueryFilter} from '@src/common/query-filter';
import {QueryConditionParser} from '@src/common/query-condition-parser';
import { UserPlanQueryCondition } from './plan.query-condition';
import { UserPlanCreateDto } from './plan.create.dto';
import { UserPlanUpdateDto } from './plan.update.dto';
import { PlanStatus } from '@prisma/client';
import { AutoPlanningService } from '../auto-planning/planning.service';
const moment = require('moment');

@Injectable()
export class UserPlanService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly queryConditionParser: QueryConditionParser,
    private readonly autoPlanningService: AutoPlanningService
  ) {}

  async findAll(queryCondition: UserPlanQueryCondition, offset: number, limit: number) {
    const filter: QueryFilter = this.queryConditionParser.parse(queryCondition);
    return await this.prismaService.userPlan.findMany({
      orderBy: {
        id: 'desc',
      },
      where: filter,
      skip: offset,
      take: limit,
    });
  }

  async findTotal(queryCondition: UserPlanQueryCondition): Promise<number> {
    const filter: QueryFilter = this.queryConditionParser.parse(queryCondition);
    return this.prismaService.userPlan.count(
        {
          where: filter,
        }
    );
  }

  async findById(id: number) {
    return this.prismaService.userPlan.findUnique({
      where: {
        id: id
      },
      select: {
        id: true,
        user_id: true,
        name: true,
        status: true,
        planned_start_time: true,
        planned_end_time: true,
        UserTaskGroup: {
          include: {
            UserTask: true
          }
        }
      
      }
    });
  }
  

  async create(userId: number, dto: UserPlanCreateDto) {
    return this.prismaService.userPlan.create({
      // @ts-ignore
      data: {
        user_id: userId,
        name: dto.name,
        status: dto.status
      }
    });
  }

  async update(id: number, dto: UserPlanUpdateDto, userId: number) {
    const plan = await this.prismaService.userPlan.findFirst({
      where: {
        id: id,
        user_id: userId,
        status: {
          not: PlanStatus.COMPLETE
        }
      }
    });
    if (!plan){
      throw new Error('未找到该计划信息/该计划不属于当前请求用户/该计划已完结');
    }
    return this.prismaService.userPlan.update({
      data: dto,
      where: {
        id: id,
      },
    });
  }

  async delete(id: number) {
  }

  //  通过平台模版生成用户个人计划
  async generateByTemplate(userId, templateId){

  }
}
