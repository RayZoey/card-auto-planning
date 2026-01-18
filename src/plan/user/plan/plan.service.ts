/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-01-18 23:53:04
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
import { PlanStatus, TaskStatus } from '@prisma/client';
import { AutoPlanningService } from '../auto-planning/planning.service';
const moment = require('moment');

@Injectable()
export class UserPlanService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly queryConditionParser: QueryConditionParser,
    private readonly autoPlanningService: AutoPlanningService
  ) {}

  //  获取下一个计划日可提前任务列表
  async getNextAdvanceTaskList(accountId: number, planId: number, currentDateNo: number){
    return await this.prismaService.userPlanDayTrack.findFirst({
      where: {
        plan_id: planId,
        is_complete: false,
        date_no: currentDateNo + 1,
      },
      select: {
        id: true,
        date_no: true,
        UserTaskScheduler: {
          select: {
            date_no: true,
            day_sort: true,
            priority: true,
            status: true,
            task: {
              select: {
                id: true,
                name: true,
                task_group_id: true,
                background: true,
                timing_type: true
              }
            }
          }
        }
      }
    });
  }

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

  //  用户切换模版
  async changeTemplate(userId: number, planId: number, newTemplateId: number){
    // 1. 查询当前计划
    const currentPlan = await this.prismaService.userPlan.findFirst({
      where: {
        id: planId,
        user_id: userId,
        status: PlanStatus.PROGRESS,
      },
    });

    if (!currentPlan) {
      throw new Error('未找到有效的该用户计划信息');
    }

    // 2. 查询新模版
    const newTemplate = await this.prismaService.planTemplate.findFirst({
      where: { id: newTemplateId },
      include: {
        PlanTemplateDetail: {
          include: {
            platform_task: true,
            platform_task_group: true,
          },
        },
      },
    });

    if (!newTemplate) {
      throw new Error('未找到对应的平台计划模版');
    }

    return await this.prismaService.$transaction(async (prisma) => {
      // 3. 获取已完成的最大日期序号（已完成的天数）
      const completedTracks = await prisma.userPlanDayTrack.findMany({
        where: {
          plan_id: planId,
          is_complete: true,
        },
        orderBy: {
          date_no: 'desc',
        },
        take: 1,
      });

      const completedDays = completedTracks.length > 0 ? completedTracks[0].date_no : 0;
      const startDayNo = completedDays + 1; // 新任务从已完成天数+1开始

      // 4. 删除所有未开始的任务（WAITING 状态）
      const waitingTasks = await prisma.userTask.findMany({
        where: {
          plan_id: planId,
          status: TaskStatus.WAITING,
        },
        select: {
          id: true,
        },
      });

      const waitingTaskIds = waitingTasks.map(t => t.id);

      if (waitingTaskIds.length > 0) {
        // 删除对应的 scheduler
        await prisma.userTaskScheduler.deleteMany({
          where: {
            task_id: { in: waitingTaskIds },
          },
        });

        // 删除任务
        await prisma.userTask.deleteMany({
          where: {
            id: { in: waitingTaskIds },
          },
        });
      }

      // 5. 删除未完成的日跟踪记录（保留已完成的）
      await prisma.userPlanDayTrack.deleteMany({
        where: {
          plan_id: planId,
          is_complete: false,
        },
      });

      // 6. 计算已完成任务的总时间
      const completedTasksTime = await prisma.userTask.aggregate({
        where: {
          plan_id: planId,
          status: { in: [TaskStatus.COMPLETE, TaskStatus.SKIP] },
        },
        _sum: {
          occupation_time: true,
        },
      });

      const completedTotalTime = completedTasksTime._sum.occupation_time || 0;

      // 7. 追加生成新模版的任务
      const userTaskGroupsMap = new Map<number, any>();
      const trackIdByDay = new Map<number, number>();

      // 为新模版的每一天创建日跟踪记录
      for (let i = 0; i < newTemplate.total_days; i++) {
        const dayNo = startDayNo + i;
        const track = await prisma.userPlanDayTrack.create({
          data: {
            plan_id: planId,
            date_no: dayNo,
            total_time: 0, // 后续会根据任务计算
            is_complete: false,
          },
        });
        trackIdByDay.set(dayNo, track.id);
      }

      // 生成新模版的任务
      let maxGlobalSort = 0;
      const existingSchedulers = await prisma.userTaskScheduler.findMany({
        where: { plan_id: planId },
        select: { global_sort: true },
        orderBy: { global_sort: 'desc' },
        take: 1,
      });
      if (existingSchedulers.length > 0) {
        maxGlobalSort = existingSchedulers[0].global_sort;
      }

      for (const detail of newTemplate.PlanTemplateDetail) {
        let userTaskGroupId: number | null = null;

        // 需要生成任务集
        if (detail.platform_task_group_id) {
          if (!userTaskGroupsMap.has(detail.platform_task_group_id)) {
            const group = await prisma.userTaskGroup.create({
              data: {
                name: detail.platform_task_group?.name ?? '',
                user_id: userId,
                plan_id: planId,
              },
            });
            userTaskGroupsMap.set(detail.platform_task_group_id, group.id);
          }
          userTaskGroupId = userTaskGroupsMap.get(detail.platform_task_group_id);
        }

        // 生成用户任务
        const task = await prisma.userTask.create({
          data: {
            plan_id: planId,
            name: detail.platform_task.name,
            user_id: userId,
            task_group_id: userTaskGroupId,
            preset_task_tag_id: detail.platform_task.preset_task_tag_id,
            occupation_time: detail.platform_task.occupation_time,
            background: detail.platform_task.background || null,
            suggested_time_start: detail.platform_task.suggested_time_start || null,
            suggested_time_end: detail.platform_task.suggested_time_end || null,
            remark: detail.platform_task.remark || null,
            annex_type: detail.platform_task.annex_type || null,
          },
        });

        // 生成用户任务调度数据（日期序号需要加上已完成天数）
        const newDateNo = detail.date_no + completedDays;
        const schedulerData: any = {
          plan_id: planId,
          task_id: task.id,
          track_id: trackIdByDay.get(newDateNo)!,
          priority: detail.priority,
          global_sort: maxGlobalSort + detail.global_sort,
          group_sort: detail.group_sort,
          day_sort: detail.day_sort,
          can_divisible: detail.can_divisible,
          date_no: newDateNo,
        };
        await prisma.userTaskScheduler.create({ data: schedulerData });
      }

      // 8. 合并 limit_hour
      let limitHourObj: Record<string, number>;
      if (typeof currentPlan.limit_hour === 'string') {
        limitHourObj = JSON.parse(currentPlan.limit_hour);
      } else {
        limitHourObj = currentPlan.limit_hour as Record<string, number>;
      }

      let newLimitHourObj: Record<string, number>;
      if (typeof newTemplate.limit_hour === 'string') {
        newLimitHourObj = JSON.parse(newTemplate.limit_hour);
      } else {
        newLimitHourObj = newTemplate.limit_hour as Record<string, number>;
      }

      // 合并 limit_hour，新模版的日期序号需要加上已完成天数
      for (const [dayKey, timeValue] of Object.entries(newLimitHourObj)) {
        const newDayKey = (parseInt(dayKey) + completedDays).toString();
        limitHourObj[newDayKey] = timeValue;
      }

      // 9. 更新计划的总天数和总时间
      const newTotalDays = completedDays + newTemplate.total_days;
      const newTotalTime = completedTotalTime + newTemplate.total_time;

      await prisma.userPlan.update({
        where: { id: planId },
        data: {
          total_days: newTotalDays,
          total_time: newTotalTime,
          limit_hour: limitHourObj,
        },
      });

      return true;
    });
  }

  //  修改计划中计划日的每日时长限制
  async changeDayLimitHour(userId: number, planId: number, dateNo: number, minTime: number){
    const userPlan = await this.prismaService.userPlan.findFirst({
      where: {
        user_id: userId,
        id: planId,
        status: 'PROGRESS'
      },
      select: {
        id: true,
        total_days: true,
        limit_hour: true
      }
    });
    if (!userPlan){
      throw new Error('未找到有效的该用户计划信息');
    }

    // 解析 limit_hour JSON（可能是字符串或已经是对象）
    let limitHourObj: Record<string, number>;
    if (typeof userPlan.limit_hour === 'string') {
      try {
        limitHourObj = JSON.parse(userPlan.limit_hour);
      } catch (e) {
        throw new Error('limit_hour 格式错误，无法解析');
      }
    } else {
      limitHourObj = userPlan.limit_hour as Record<string, number>;
    }

    // 更新对应 dateNo 的值（key 可能是字符串形式的数字）
    const dateNoKey = dateNo.toString();
    limitHourObj[dateNoKey] = minTime;

    // 保存回数据库
    await this.prismaService.userPlan.update({
      where: { id: planId },
      data: {
        limit_hour: limitHourObj,
      },
    });

    //  更新计算新的total_days

    //  更新自动规划任务

    return true;
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
  async generateByTemplate(userId, templateId, planName){
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
          name: planName,
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
