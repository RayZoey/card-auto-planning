/*
 * @Author: Reflection lighthouseinmind@yeah.net
 * @Date: 2025-09-06 16:47:19
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-09-06 20:47:24
 * @FilePath: /card-auto-planning/src/plan/user/auto-planning/planing.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/common/prisma.service';
import { BaseService } from '@src/base/base.service';
import { AutoPlanMode, DailyTaskStatus, Prisma, TaskStatus, TaskTimingType } from '@prisma/client';
const moment = require('moment');

interface TaskPlanningData {
  id: number;
  name: string;
  priority: number;
  occupation_time: number | null;
  timing_type: TaskTimingType;
  can_divisible: boolean;
  task_group_id: number | null;
  status: TaskStatus;
  planned_date: Date | null;
  seq: number;
  is_manually_adjusted: boolean;
  user_id: number;
}

interface DailyPlan {
  date: string;
  tasks: TaskPlanningData[];
  totalMinutes: number;
}

@Injectable()
export class AutoPlanningService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly baseService: BaseService,
  ) { }

  /**
   * 计划创建后立即执行自动排程
   */
  async autoPlanAfterInsert(planId: number, userId: number | null, startDate: string, mode: AutoPlanMode) {
    const plan = await this.prismaService.userPlan.findUnique({
      where: { id: planId },
      include: {
        UserTask: {
          where: { status: TaskStatus.WAITING },
          orderBy: [
            { task_group_id: 'asc' },
            { priority: 'desc' },
            { id: 'asc' }
          ]
        }
      }
    });

    if (!plan) {
      throw new Error('计划不存在');
    }

    const userConfig = await this.getUserStudyConfig(plan.user_id);
    const start = moment(startDate).startOf('day');
    const end = moment(plan.planned_end_time).endOf('day');

    // 清空现有的每日任务分配
    await this.prismaService.userDailyTask.deleteMany({
      where: { plan_id: planId }
    });

    // 重置任务计划日期
    await this.prismaService.userTask.updateMany({
      where: { plan_id: planId, status: TaskStatus.WAITING },
      data: { 
        planned_date: null, 
        seq: 0
      }
    });

    // 执行自动规划
    await this.executeAutoPlanning(plan.UserTask, start, end, userConfig, mode, planId);
  }

  /**
   * 更新规划 - 重新安排未开始的任务
   */
  async updatePlan(planId: number, userId: number) {
    const plan = await this.prismaService.userPlan.findFirst({
      where: { id: planId, user_id: userId },
      include: {
        UserTask: {
          where: { 
            status: TaskStatus.WAITING,
            planned_date: { gte: moment().startOf('day').toDate() }
          },
          orderBy: [
            { task_group_id: 'asc' },
            { priority: 'desc' },
            { id: 'asc' }
          ]
        }
      }
    });

    if (!plan) {
      throw new Error('计划不存在或无权限');
    }

    const userConfig = await this.getUserStudyConfig(userId);
    const start = moment().startOf('day');
    const end = moment(plan.planned_end_time).endOf('day');

    // 清空未来的每日任务分配
    await this.prismaService.userDailyTask.deleteMany({
      where: { 
        plan_id: planId,
        date: { gte: start.toDate() }
      }
    });

    // 重置未开始任务的计划日期
    await this.prismaService.userTask.updateMany({
      where: { 
        plan_id: planId, 
        status: TaskStatus.WAITING,
        planned_date: { gte: start.toDate() }
      },
      data: { 
        planned_date: null, 
        seq: 0
      }
    });

    // 执行自动规划
    await this.executeAutoPlanning(plan.UserTask, start, end, userConfig, userConfig.auto_plan_mode, planId);

    // 记录操作
    await this.prismaService.userPlanOperation.create({
      data: {
        user_id: userId,
        plan_id: planId,
        operation: 'UPDATE_PLAN',
        payload: { mode: userConfig.auto_plan_mode }
      }
    });
  }

  /**
   * 执行自动规划算法
   */
  private async executeAutoPlanning(
    tasks: TaskPlanningData[], 
    startDate: moment.Moment, 
    endDate: moment.Moment, 
    config: any, 
    mode: AutoPlanMode, 
    planId: number
  ) {
    const dailyPlans: DailyPlan[] = [];
    const maxDailyMinutes = config.max_daily_minutes || 480;

    // 按模式排序任务
    const sortedTasks = this.sortTasksByMode(tasks, mode);

    let currentDate = startDate.clone();
    let currentDayTasks: TaskPlanningData[] = [];
    let currentDayMinutes = 0;

    for (const task of sortedTasks) {
      const taskMinutes = task.occupation_time || 0;
      
      // 检查当前日期是否能容纳此任务
      if (currentDayMinutes + taskMinutes > maxDailyMinutes && currentDayTasks.length > 0) {
        // 保存当前日期计划
        dailyPlans.push({
          date: currentDate.format('YYYY-MM-DD'),
          tasks: [...currentDayTasks],
          totalMinutes: currentDayMinutes
        });

        // 移动到下一天
        currentDate.add(1, 'day');
        if (currentDate.isAfter(endDate)) {
          break; // 超出计划结束时间
        }
        currentDayTasks = [];
        currentDayMinutes = 0;
      }

      // 添加任务到当前日期
      currentDayTasks.push({
        ...task,
        planned_date: currentDate.toDate(),
        seq: currentDayTasks.length
      });
      currentDayMinutes += taskMinutes;
    }

    // 保存最后一天的计划
    if (currentDayTasks.length > 0) {
      dailyPlans.push({
        date: currentDate.format('YYYY-MM-DD'),
        tasks: [...currentDayTasks],
        totalMinutes: currentDayMinutes
      });
    }

    // 保存到数据库
    await this.saveDailyPlans(dailyPlans, planId);
  }

  /**
   * 根据模式排序任务
   */
  private sortTasksByMode(tasks: TaskPlanningData[], mode: AutoPlanMode): TaskPlanningData[] {
    switch (mode) {
      case AutoPlanMode.MODE1:
        // 任务集 + 优先度
        return tasks.sort((a, b) => {
          if (a.task_group_id !== b.task_group_id) {
            return (a.task_group_id || 0) - (b.task_group_id || 0);
          }
          return b.priority - a.priority;
        });

      case AutoPlanMode.MODE2:
        // 任务集 + 顺序
        return tasks.sort((a, b) => {
          if (a.task_group_id !== b.task_group_id) {
            return (a.task_group_id || 0) - (b.task_group_id || 0);
          }
          return a.id - b.id;
        });

      case AutoPlanMode.MODE3:
        // 不考虑任务集 + 优先度
        return tasks.sort((a, b) => b.priority - a.priority);

      case AutoPlanMode.MODE4:
        // 不考虑任务集 + 顺序
        return tasks.sort((a, b) => a.id - b.id);

      case AutoPlanMode.MODE5:
        // 全局优先度（跨天一次性重排）
        return tasks.sort((a, b) => b.priority - a.priority);

      default:
        return tasks;
    }
  }

  /**
   * 保存每日计划到数据库
   */
  private async saveDailyPlans(dailyPlans: DailyPlan[], planId: number) {
    for (const dayPlan of dailyPlans) {
      for (const task of dayPlan.tasks) {
        // 更新任务计划日期
        await this.prismaService.userTask.update({
          where: { id: task.id },
          data: {
            planned_date: task.planned_date,
            seq: task.seq
          }
        });

        // 创建每日任务记录
        await this.prismaService.userDailyTask.create({
          data: {
            user_id: task.user_id,
            plan_id: planId,
            user_task_id: task.id,
            date: new Date(dayPlan.date),
            planned_minutes: task.occupation_time || 0,
            seq: task.seq,
            status: DailyTaskStatus.PLANNED
          }
        });
      }
    }
  }

  /**
   * 获取用户学习配置
   */
  private async getUserStudyConfig(userId: number) {
    let config = await this.prismaService.userStudyConfig.findUnique({
      where: { user_id: userId }
    });

    if (!config) {
      // 创建默认配置
      config = await this.prismaService.userStudyConfig.create({
        data: {
          user_id: userId,
          plan_type: 'CUSTOM',
          auto_plan_mode: 'MODE1',
          max_daily_minutes: 480
        }
      });
    }

    return config;
  }

  /**
   * 验证当日任务时间是否超限
   */
  async validateDailyTaskTime(planId: number, date: string, additionalMinutes: number = 0): Promise<{
    isValid: boolean;
    currentMinutes: number;
    maxMinutes: number;
    message?: string;
  }> {
    const user = await this.prismaService.userPlan.findFirst({
      where: { id: planId },
      select: { user_id: true }
    });

    if (!user) {
      throw new Error('计划不存在');
    }

    const config = await this.getUserStudyConfig(user.user_id);
    const maxMinutes = config.max_daily_minutes;

    // 获取当日已分配的任务时间
    const dailyTasks = await this.prismaService.userDailyTask.findMany({
      where: {
        plan_id: planId,
        date: new Date(date)
      }
    });

    const currentMinutes = dailyTasks.reduce((sum, task) => sum + task.planned_minutes, 0);
    const totalMinutes = currentMinutes + additionalMinutes;

    return {
      isValid: totalMinutes <= maxMinutes,
      currentMinutes,
      maxMinutes,
      message: totalMinutes > maxMinutes 
        ? `当日任务时间将超过限制！当前：${currentMinutes}分钟，新增：${additionalMinutes}分钟，总计：${totalMinutes}分钟，限制：${maxMinutes}分钟`
        : undefined
    };
  }
}
