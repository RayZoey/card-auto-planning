/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-09-06 21:31:24
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
import { AutoPlanMode, PlanStatus } from '@prisma/client';
import { AutoPlanningService } from '../auto-planning/planing.service';
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
  
  //  用户使用模版生成计划
  async generateByTemplate(userId: number, templateId: number){
    const templateJson = await this.prismaService.planTemplate.findFirst({
      where: {
        id: templateId,
        is_enable: true
      },
      select: {
        name: true,
        total_time: true,
        PlanTemplateAndTaskGroupRelation: {
          include: {
            platform_task_group: {
              include: {
                PlatformTaskGroupAndTaskRelation: {
                  include: {
                    platform_task: true,
                  }
                }
              }
            }
          }
        }
      }
    });
    if (!templateJson){
      throw new Error('未找到该模版或模版不可用');
    }
      /* 1. 创建计划本身 */
    const plan = await this.prismaService.userPlan.create({
      data: {
        user_id: userId,
        name: templateJson.name,
        planned_start_time: new Date(),
        planned_end_time: new Date(Date.now() + templateJson.total_time * 24 * 60 * 60 * 1000)
      }
    });

    await this.prismaService.$transaction(async (prisma) => {

      /* 2. 批量创建任务组（拿到 id） */
      const taskGroups = await Promise.all(
        templateJson.PlanTemplateAndTaskGroupRelation.map((tg) =>
          prisma.userTaskGroup.create({
            data: {
              name: tg.platform_task_group.name,
              user_id: userId,
              plan_id: plan.id,   // 关联刚创建的计划
            }
          })
        )
      );

      /* 3. 收集所有任务，一次性给用户创建任务 */
      const tasksToCreate: any[] = [];
      templateJson.PlanTemplateAndTaskGroupRelation.forEach((tg, idx) => {
        tg.platform_task_group.PlatformTaskGroupAndTaskRelation.forEach(({ platform_task: t }) => {
          tasksToCreate.push(
            prisma.userTask.create({
              data: {
                name: t.name,
                user_id: userId,
                plan_id: plan.id,  // 关联刚创建的计划
                task_group_id: taskGroups[idx].id, // 关联对应任务组
                priority: t.priority,
                background: t.background,
                suggested_time_start: t.suggested_time_start,
                suggested_time_end: t.suggested_time_end,
                remark: t.remark,
                annex_type: t.annex_type as any,
                annex: t.annex,
                timing_type: t.timing_type as any,
                occupation_time: t.occupation_time,
                can_divisible: t.can_divisible,
              }
            })
          );
        });
      });

      if (tasksToCreate.length) {
        await Promise.all(tasksToCreate);
      }
        /* === 基于模板创建：只复制任务，不触发自动规划 === */
    });
    return 'OK';

  }

  //  用户创建普通计划
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

  /**
   * 手动触发自动规划 - 用于手动创建的计划
   */
  async triggerAutoPlanning(planId: number, userId: number) {
    const plan = await this.prismaService.userPlan.findFirst({
      where: { id: planId, user_id: userId }
    });
    
    if (!plan) {
      throw new Error('计划不存在或无权限');
    }

    return await this.autoPlanningService.autoPlanAfterInsert(
      planId, 
      userId, 
      plan.planned_start_time.toISOString(), 
      'MODE1'
    );
  }

  /**
   * 更新规划 - 重新安排未开始的任务
   */
  async updatePlan(planId: number, userId: number) {
    return await this.autoPlanningService.updatePlan(planId, userId);
  }

  /**
   * 获取计划的每日任务概览
   */
  async getPlanDailyOverview(planId: number, userId: number, startDate?: string, endDate?: string) {
    const plan = await this.prismaService.userPlan.findFirst({
      where: { id: planId, user_id: userId }
    });

    if (!plan) {
      throw new Error('计划不存在或无权限');
    }

    const start = startDate ? moment(startDate).startOf('day') : moment().startOf('day');
    const end = endDate ? moment(endDate).endOf('day') : moment(plan.planned_end_time).endOf('day');

    const dailyTasks = await this.prismaService.userDailyTask.findMany({
      where: {
        plan_id: planId,
        date: {
          gte: start.toDate(),
          lte: end.toDate()
        }
      },
      include: {
        user_task: {
          select: {
            id: true,
            name: true,
            timing_type: true,
            status: true,
            is_manually_adjusted: true
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { seq: 'asc' }
      ]
    });

    // 按日期分组
    const groupedByDate = dailyTasks.reduce((acc, task) => {
      const date = moment(task.date).format('YYYY-MM-DD');
      if (!acc[date]) {
        acc[date] = {
          date,
          tasks: [],
          totalMinutes: 0,
          completedMinutes: 0
        };
      }
      acc[date].tasks.push(task);
      acc[date].totalMinutes += task.planned_minutes;
      acc[date].completedMinutes += task.done_minutes;
      return acc;
    }, {} as Record<string, any>);

    return {
      plan: {
        id: plan.id,
        name: plan.name,
        status: plan.status,
        planned_start_time: plan.planned_start_time,
        planned_end_time: plan.planned_end_time
      },
      dailyOverview: Object.values(groupedByDate)
    };
  }
}
