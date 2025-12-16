/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-12-16 21:55:37
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

  //  获取用户计划中最新一天没有完成的任务列表
  async getLatestUncompletedTasks(userId: number, planId: number) {
    return await this.prismaService.userPlanDayTrack.findMany({
      where: {
        plan_id: planId,
        is_complete: false,
      },
      include: {
        UserTaskScheduler: {
          include: {
            task: {
              include: {
                group: true,
                preset_task_tag: true
              }
            }
          }
        }
      },
      orderBy: {
        date_no: 'asc'
      },
      take: 1,
    });
    
  }

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
      include: {
        UserTask: {
          include: {
            UserTaskScheduler: true
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
          notIn: [PlanStatus.COMPLETE, PlanStatus.CANCEL]
        }
      }
    });
    if (!plan){
      throw new Error('未找到该计划信息/该计划已完结或取消');
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
    // 1. 查询平台任务模版及其所有详情
    const template = await this.prismaService.planTemplate.findFirst({
      where: { id: templateId },
      include: {
        PlanTemplateDetail: {
          include: {
            platform_task: true,
            platform_task_group: true,
          },
        },
      },
    });

    if (!template) {
      throw new Error('未找到对应的平台计划模版');
    }
    // 使用Prisma事务管理，避免数据不一致
    return await this.prismaService.$transaction(async (prisma) => {
      // 2. 生成用户计划
      const now = new Date();
      const userPlan = await prisma.userPlan.create({
        data: {
          user_id: userId,
          name: template.name,
          status: PlanStatus.PROGRESS, // 可按需要自定义默认状态
          total_days: template.total_days,
          planned_start_time: now,
          limit_hour: template.limit_hour,
          total_time: template.total_time
        },
      });

      const userTaskGroupsMap = new Map<number, any>();
      // 预先为每一天创建日跟踪记录，便于后续 scheduler 绑定 track_id
      const trackIdByDay = new Map<number, number>();
      for (let dayNo = 1; dayNo <= template.total_days; dayNo++) {
        const track = await prisma.userPlanDayTrack.create({
          data: {
            plan_id: userPlan.id,
            date_no: dayNo,
            total_time: userPlan.total_time,
            is_complete: false,
          },
        });
        trackIdByDay.set(dayNo, track.id);
      }

      // 3. 按PlanTemplateDetail批量生成任务集与任务
      for (const detail of template.PlanTemplateDetail) {
      
        let userTaskGroupId: number | null = null;

        // 需要生成任务集
        if (detail.platform_task_group_id) {
          // 尚未为此group生成用户任务集
          if (!userTaskGroupsMap.has(detail.platform_task_group_id)) {
            const group = await prisma.userTaskGroup.create({
              data: {
                name: detail.platform_task_group?.name ?? '',
                user_id: userId,
                plan_id: userPlan.id
              },
            });
            userTaskGroupsMap.set(detail.platform_task_group_id, group.id);
          }
          userTaskGroupId = userTaskGroupsMap.get(detail.platform_task_group_id);
        }

        // 生成用户任务
        const task = await prisma.userTask.create({
          data: {
            plan_id: userPlan.id,
            name: detail.platform_task.name,
            user_id: userId,
            task_group_id: userTaskGroupId,
            preset_task_tag_id:  detail.platform_task.preset_task_tag_id,
            occupation_time: detail.platform_task.occupation_time,
            background: detail.platform_task.background || null,
            suggested_time_start: detail.platform_task.suggested_time_start || null,
            suggested_time_end: detail.platform_task.suggested_time_end || null,
            remark: detail.platform_task.remark || null,
            annex_type: detail.platform_task.annex_type || null,
          },
        });

        //  生成用户任务调度数据
        const schedulerData: any = {
          plan_id: userPlan.id,
          task_id: task.id,
          track_id: trackIdByDay.get(detail.date_no)!,
          priority: detail.priority,
          global_sort: detail.global_sort,
          group_sort: detail.group_sort,
          day_sort: detail.day_sort,
          can_divisible: detail.can_divisible,
          date_no: detail.date_no,
        };
        await prisma.userTaskScheduler.create({ data: schedulerData });
      }

      return true;
      // return { userPlan, userTaskGroups, userTasks };
    });
  }
}
