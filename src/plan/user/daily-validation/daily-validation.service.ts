import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/common/prisma.service';
import { TaskTimingType } from '@prisma/client';
const moment = require('moment');

interface DailyValidationResult {
  isValid: boolean;
  currentMinutes: number;
  maxMinutes: number;
  pomodoroCount: number;
  freeTimingMinutes: number;
  untimingCount: number;
  message?: string;
  suggestions?: string[];
}

@Injectable()
export class DailyValidationService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 验证当日任务时间配置
   */
  async validateDailyTasks(planId: number, date: string, additionalTask?: {
    timing_type: TaskTimingType;
    occupation_time?: number;
  }): Promise<DailyValidationResult> {
    const plan = await this.prismaService.userPlan.findFirst({
      where: { id: planId },
      select: { user_id: true }
    });

    if (!plan) {
      throw new Error('计划不存在');
    }

    // 获取用户配置
    const config = await this.getUserStudyConfig(plan.user_id);
    const maxMinutes = config.max_daily_minutes;

    // 获取当日任务
    const dailyTasks = await this.prismaService.userDailyTask.findMany({
      where: {
        plan_id: planId,
        date: new Date(date)
      },
      include: {
        user_task: {
          select: {
            timing_type: true,
            occupation_time: true
          }
        }
      }
    });

    // 计算当前时间分配
    let currentMinutes = 0;
    let pomodoroCount = 0;
    let freeTimingMinutes = 0;
    let untimingCount = 0;

    for (const task of dailyTasks) {
      const minutes = task.planned_minutes;
      currentMinutes += minutes;

      switch (task.user_task.timing_type) {
        case TaskTimingType.POMODORO:
          pomodoroCount += Math.ceil(minutes / 25); // 默认25分钟一个番茄钟
          break;
        case TaskTimingType.FREE_TIMING:
          freeTimingMinutes += minutes;
          break;
        case TaskTimingType.UNTIMING:
          untimingCount += 1;
          break;
      }
    }

    // 如果提供了额外任务，计算其影响
    if (additionalTask) {
      const additionalMinutes = additionalTask.occupation_time || 0;
      currentMinutes += additionalMinutes;

      switch (additionalTask.timing_type) {
        case TaskTimingType.POMODORO:
          pomodoroCount += Math.ceil(additionalMinutes / 25); // 默认25分钟一个番茄钟
          break;
        case TaskTimingType.FREE_TIMING:
          freeTimingMinutes += additionalMinutes;
          break;
        case TaskTimingType.UNTIMING:
          untimingCount += 1;
          break;
      }
    }

    const isValid = currentMinutes <= maxMinutes;
    const suggestions = this.generateSuggestions(
      currentMinutes, 
      maxMinutes, 
      pomodoroCount, 
      freeTimingMinutes, 
      untimingCount,
      config
    );

    return {
      isValid,
      currentMinutes,
      maxMinutes,
      pomodoroCount,
      freeTimingMinutes,
      untimingCount,
      message: isValid 
        ? undefined 
        : `当日任务时间将超过限制！当前：${currentMinutes}分钟，限制：${maxMinutes}分钟`,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  /**
   * 生成优化建议
   */
  private generateSuggestions(
    currentMinutes: number,
    maxMinutes: number,
    pomodoroCount: number,
    freeTimingMinutes: number,
    untimingCount: number,
    config: any
  ): string[] {
    const suggestions: string[] = [];
    const overMinutes = currentMinutes - maxMinutes;

    if (overMinutes > 0) {
      suggestions.push(`建议减少 ${overMinutes} 分钟的任务时间`);
    }

    // 番茄钟相关建议
    if (pomodoroCount > 0) {
      suggestions.push(`预计需要 ${pomodoroCount} 个番茄钟`);
      
      if (pomodoroCount > 8) {
        suggestions.push('番茄钟数量较多，建议考虑分割任务或调整到其他日期');
      }
    }

    // 自由计时建议
    if (freeTimingMinutes > 0) {
      suggestions.push(`自由计时任务共 ${freeTimingMinutes} 分钟`);
      if (freeTimingMinutes > maxMinutes * 0.6) {
        suggestions.push('自由计时任务时间较长，建议考虑分割或使用番茄钟模式');
      }
    }

    // 不计时任务建议
    if (untimingCount > 0) {
      suggestions.push(`有 ${untimingCount} 个不计时任务，建议合理安排时间`);
    }

    // 时间分配建议
    const pomodoroRatio = (pomodoroCount * 25) / currentMinutes; // 默认25分钟一个番茄钟
    if (pomodoroRatio > 0.8) {
      suggestions.push('番茄钟任务占比过高，建议适当增加自由计时任务');
    } else if (pomodoroRatio < 0.3 && pomodoroCount > 0) {
      suggestions.push('可以增加番茄钟任务来提高学习效率');
    }

    return suggestions;
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
   * 获取当日任务概览
   */
  async getDailyTaskOverview(planId: number, date: string) {
    const dailyTasks = await this.prismaService.userDailyTask.findMany({
      where: {
        plan_id: planId,
        date: new Date(date)
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
      orderBy: { seq: 'asc' }
    });

    const validation = await this.validateDailyTasks(planId, date);

    return {
      date,
      tasks: dailyTasks,
      validation,
      summary: {
        totalTasks: dailyTasks.length,
        totalMinutes: validation.currentMinutes,
        maxMinutes: validation.maxMinutes,
        utilizationRate: Math.round((validation.currentMinutes / validation.maxMinutes) * 100)
      }
    };
  }
}
