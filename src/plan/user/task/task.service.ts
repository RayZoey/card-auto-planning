/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-02-01 16:28:08
 * @FilePath: /card-backend/src/card/pdf-print-info/pdf-print-info.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {forwardRef, HttpException, HttpStatus, Inject, Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {BaseService} from '@src/base/base.service';
import {QueryFilter} from '@src/common/query-filter';
import {QueryConditionParser} from '@src/common/query-condition-parser';
import { PlanStatus, TaskAnnexType, TaskStatus, TaskTimingType } from '@prisma/client';
import { UserTaskCreateDto } from './task.create.dto';
import { UserTaskUpdateDto } from './task.update.dto';
import { UserTaskBaseUpdateDto } from './task.base-update.dto';
import { UserPlanService } from '../plan/plan.service';
const moment = require('moment');

@Injectable()
export class UserTaskService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly baseService: BaseService,
    private readonly queryConditionParser: QueryConditionParser,
    @Inject(forwardRef(() => UserPlanService))
    private readonly planService: UserPlanService,
  ) {}

  /**
   * 从某一天开始触发自动规划（复用新增/删除任务后的同一套核心逻辑）
   * - 先按当天上限处理超时：超出则顺延/拆分到后续天
   * - 再补满当天：不足则从后续天按优先级/任务集规则前移任务（必要时拆分）
   * - 最后重建全局/当日排序
   *
   * 注意：该方法依赖 user_plan_day_track.total_time 作为日上限来源。
   */
  async replanFromDay(prismaService: any, planId: number, startDayNo: number) {
    const plan = await prismaService.userPlan.findUnique({ where: { id: planId } });
    if (!plan) return;

    // 从 startDayNo 开始往后处理，直到没有更多任务且后续天也不再受影响
    // 这里不强依赖 plan.total_days 的精确性：handleDayOverflow / fillGap 过程中可能会创建后续天
    let dayNo = startDayNo;
    // 防御：避免极端数据导致死循环
    const maxIterations = 5000;
    let iter = 0;

    while (iter++ < maxIterations) {
      // 如果当天没有 track（极少数情况），ensure 一下，避免后续 getDayLimitFromTrack 读不到
      await this.ensurePlanDayTrack(prismaService, planId, dayNo);

      // 1) 处理超时：把超出的任务顺延/拆分到后续天
      await this.handleDayOverflow(prismaService, { planId, dayNo, plan });

      // 2) 补满：把后续天的任务前移填充到当天（必要时拆分）
      await this.recursivelyFillDayGap(prismaService, {
        planId,
        targetDayNo: dayNo,
        minutesNeeded: 0,
        deletedTaskGroupId: null,
        deletedGroupSort: null,
        plan,
      });

      // 3) 判断是否还需要继续往后处理
      const hasLaterTasks = await prismaService.userTaskScheduler.findFirst({
        where: { plan_id: planId, date_no: { gt: dayNo } },
        select: { task_id: true },
      });
      if (!hasLaterTasks) {
        break;
      }
      dayNo += 1;
    }

    await this.rebuildPlanOrders(prismaService, planId);
  }

  // 确保某计划某日的日跟踪存在，返回记录
  private async ensurePlanDayTrack(prismaService: any, planId: number, dayNo: number) {
    return prismaService.userPlanDayTrack.upsert({
      where: {
        plan_id_date_no: {
          plan_id: planId,
          date_no: dayNo,
        },
      },
      update: {},
      create: {
        plan_id: planId,
        date_no: dayNo,
        total_time: 0,
        is_complete: false,
      },
    });
  }
  
  //  获取学习总览
  async overview(userId: number, planId: number, startDate: Date, endDate: Date){
    let res = {
      total_clock_in_days: 0,
      total_learning_time: 0,
      process_num: 0,
      current_month_clock_in_days: 0,
      daily_time_list:[],
      time_comparison: {
        free_timing: {
          actual_time: 0,
          occupation_time: 0,
        },
        normal_timing: {
          actual_time: 0,
          occupation_time: 0,
        },
        group_timing: {
          actual_time: 0,
          occupation_time: 0,
        },
      },
      group_task_comparison: [
        {
          group_name: null,
          actual_time: 0,
          occupation_time: 0,
        }
      ],
    };

    //  获取总打卡天数
    res.total_clock_in_days = await this.prismaService.userPlanDayTrack.count({
      where: {
        plan_id: planId,
        is_complete: true,
      },
    });

    //  获取该计划的学习总时长
    const totalLearningTime = await this.prismaService.userTask.aggregate({
      where: {
        plan_id: planId,
        actual_time: { not: null },
        status: { not: TaskStatus.SKIP },
      },
      _sum: {
        actual_time: true,
      },
    });

    //  学习进度【学习总时长+剩余所有任务的标准占用时间】
    const totalProcessTime = await this.prismaService.userTask.aggregate({
      where: {
        plan_id: planId,
        status: 'WAITING'
      },
      _sum: {
        occupation_time: true,
      },
    })

    const processNum = (totalLearningTime._sum.actual_time / (totalProcessTime._sum.occupation_time + totalLearningTime._sum.actual_time));

    res.total_learning_time = totalLearningTime._sum.actual_time;
    res.process_num = processNum;

    //  获取当月打卡天数
    res.current_month_clock_in_days = await this.prismaService.userPlanDayTrack.count({
      where: {
        plan_id: planId,
        is_complete: true,
        completed_at: { gte: startDate, lte: endDate },
      },
    });

    //  获取时间范围内每天的专注时间（每天实际学习总时间）
    const dailyTimeList = await this.prismaService.userPlanDayTrack.findMany({
      where: {
        plan_id: planId,
        completed_at: { gte: startDate, lte: endDate },
      },
      select: {
        date_no: true,
        total_time: true,
        completed_at: true,
      },
    });
    res.daily_time_list = dailyTimeList;

    //  获取所有非任务集且非自由计时任务的时间总和
    const normalTime = await this.prismaService.userTask.aggregate({
      where: {
        plan_id: planId,
        task_group_id: null,
        status: 'COMPLETE',
        timing_type: { not: TaskTimingType.FREE_TIMING },
        actual_time_end: { gte: startDate, lte: endDate }
      },
      _sum: {
        occupation_time: true,
        actual_time: true,
      },});

    //  获取所有非自由计时任务的时间总和
    const freeTimingTasksTime = await this.prismaService.userTask.aggregate({
      where: {
        plan_id: planId,
        status: 'COMPLETE',
        timing_type: TaskTimingType.FREE_TIMING,
        actual_time_end: { gte: startDate, lte: endDate }
      },
      _sum: {
        occupation_time: true,
        actual_time: true,
      },});

    // 获取所有任务集任务的时间总和
    const groupTimingTasksTime = await this.prismaService.userTask.aggregate({
      where: {
        plan_id: planId,
        task_group_id: { not: null },
        status: 'COMPLETE',
        timing_type: { not: TaskTimingType.FREE_TIMING },
        actual_time_end: { gte: startDate, lte: endDate }
      },
      _sum: {
        occupation_time: true,
        actual_time: true,
      },});

      res.time_comparison.normal_timing = normalTime._sum;
      res.time_comparison.free_timing = freeTimingTasksTime._sum;
      res.time_comparison.group_timing = groupTimingTasksTime._sum;

      //  获取时间段内所有任务集任务并根据任务集聚合后计算每个任务集的占用时间和实际时间并将列表放入res.group_task_comparison中
      const taskGroupTasks = await this.prismaService.userTask.findMany({
        where: {
          plan_id: planId,
          task_group_id: { not: null },
          status: TaskStatus.COMPLETE,
          actual_time_end: { gte: startDate, lte: endDate }
        },
        select: {
          task_group_id: true,
          occupation_time: true,
          actual_time: true,
          group: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      });

      // 按任务集分组并计算占用时间和实际时间总和
      const taskGroupTimeMap = new Map<number, { group_name: string; actual_time: number; occupation_time: number }>();
      
      for (const task of taskGroupTasks) {
        if (task.task_group_id) {
          const groupId = task.task_group_id;
          const existing = taskGroupTimeMap.get(groupId);
          
          if (existing) {
            existing.occupation_time += task.occupation_time || 0;
            existing.actual_time += task.actual_time || 0;
          } else {
            taskGroupTimeMap.set(groupId, {
              group_name: task.group?.name || '',
              occupation_time: task.occupation_time || 0,
              actual_time: task.actual_time || 0
            });
          }
        }
      }

      // 转换为数组并按实际时间降序排序
      res.group_task_comparison = Array.from(taskGroupTimeMap.values())
        .sort((a, b) => b.actual_time - a.actual_time);

    return res;
  }

  //  获取今日学习统计
  async getTodayLearningStatistics(userId: number, planId: number, dateNo: number) {
    //  检查dateNo之前是否有未关闭的date
    const previousDayTracks = await this.prismaService.userPlanDayTrack.findMany({
      where: {
        plan_id: planId,
        date_no: { lt: dateNo },
        is_complete: false,
      },
    });
    if (previousDayTracks.length > 0) {
      throw new HttpException('第' + dateNo + '天之前有未关闭的日期，无法获取学习统计', HttpStatus.BAD_REQUEST);
    }
    //  检查dateNo是否存在
    const existingTrack = await this.prismaService.userPlanDayTrack.findFirst({
      where: {
        plan_id: planId,
        date_no: dateNo,
      },
    });
    if (!existingTrack) {
      throw new HttpException('第' + dateNo + '天不存在，无法获取学习统计', HttpStatus.BAD_REQUEST);
    }
    //  获取今日每个任务的计划耗时与实际耗时以及所属任务集信息
    const todayTasks = await this.prismaService.userTaskScheduler.findMany({
      where: {
        plan_id: planId,
        date_no: dateNo,
      },
      select: {
        task_id: true,
        task: {
          select: {
            name: true,
            occupation_time: true,
            actual_time: true,
            task_group_id: true,
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      }
    });
    return todayTasks;
  }

  //  标记今日所有任务已完成（完成打卡）
  async markDayComplete(userId: number, planId: number, dateNo: number, learningExperience: string, annex: any, score: string) {
    //  检查dateNo之前是否有未关闭的date
    const previousDayTracks = await this.prismaService.userPlanDayTrack.findMany({
      where: {
        plan_id: planId,
        date_no: { lt: dateNo },
        is_complete: false,
      },
    });
    if (previousDayTracks.length > 0) {
      throw new HttpException('第' + dateNo + '天之前有未关闭的日期，无法打卡', HttpStatus.BAD_REQUEST);
    }
    //  检查当日是否已经打卡
    const existingTrackCheck = await this.prismaService.userPlanDayTrack.findFirst({
      where: {
        plan_id: planId,
        date_no: dateNo,
        is_complete: true,
      },
    });
    if (existingTrackCheck) {
      throw new HttpException('第' + dateNo + '天已经打卡', HttpStatus.BAD_REQUEST);
    }

    // 处理 annex 和 learning_experience，如果是对象则转为字符串
    const annexStr = (annex && typeof annex === 'object') ? JSON.stringify(annex) : annex;
    const learningExperienceStr = (learningExperience && typeof learningExperience === 'object') ? JSON.stringify(learningExperience) : learningExperience;

    return await this.prismaService.$transaction(async (tx) => {
      // 验证计划属于该用户
      const plan = await tx.userPlan.findFirst({
        where: {
          id: planId,
          user_id: userId,
        },
      });
      if (!plan) {
        throw new HttpException('计划不存在或不属于当前用户', HttpStatus.BAD_REQUEST);
      }

      // 获取该日所有未完成的任务
      const dayTasks = await tx.userTaskScheduler.findMany({
        where: {
          plan_id: planId,
          date_no: dateNo,
          status: { not: { in: [TaskStatus.COMPLETE, TaskStatus.SKIP] } },
        },
        include: {
          task: true,
        },
      });

      // 如果有未完成的任务，不允许打卡
      if (dayTasks.length > 0) {
        throw new HttpException('当日还有未完成的任务，无法打卡', HttpStatus.BAD_REQUEST);
      }

      // 获取该日所有任务（用于统计）
      const allDayTasks = await tx.userTaskScheduler.findMany({
        where: {
          plan_id: planId,
          date_no: dateNo,
        },
        include: {
          task: true,
        },
      });

      // 更新或创建每日跟踪记录，标记为完成
      const now = new Date();
      const existingTrack = await tx.userPlanDayTrack.findFirst({
        where: {
          plan_id: planId,
          date_no: dateNo,
        },
      });

      if (existingTrack) {
        await tx.userPlanDayTrack.update({
          where: { id: existingTrack.id },
          data: {
            is_complete: true,
            completed_at: now,
            learning_experience: learningExperienceStr,
            annex: annexStr,
            score: score,
          },
        });
      } else {
        // 如果没有记录，从任务统计中计算total_time
        const totalTime = allDayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
        await tx.userPlanDayTrack.create({
          data: {
            plan_id: planId,
            date_no: dateNo,
            is_complete: true,
            completed_at: now,
            total_time: totalTime,
            learning_experience: learningExperienceStr,
            annex: annexStr,
            score: score,
          },
        });
      }

      return { success: true, completedCount: 0 };
    });
  }

  //  处理当日未完成任务（跳过或延期）
  async processDayTasks(
    userId: number,
    planId: number,
    dateNo: number,
    tasks: Array<{ task_id: number; action: 'skip' | 'postpone' }>,
    needAutoFill: boolean
  ) {
    return await this.prismaService.$transaction(async (tx) => {
      // 验证计划属于该用户
      const plan = await tx.userPlan.findFirst({
        where: {
          id: planId,
          user_id: userId,
        },
      });
      if (!plan) {
        throw new HttpException('计划不存在或不属于当前用户', HttpStatus.BAD_REQUEST);
      }

      // 获取该日所有未完成/未跳过的任务
      const incompleteTasks = await tx.userTaskScheduler.findMany({
        where: {
          plan_id: planId,
          date_no: dateNo,
          status: { not: { in: [TaskStatus.COMPLETE, TaskStatus.SKIP] } },
        },
        include: {
          task: true,
        },
      });

      // 验证任务数量是否相等
      if (tasks.length !== incompleteTasks.length) {
        throw new HttpException(
          `任务数量不匹配：当前有 ${incompleteTasks.length} 个未完成任务，但提供了 ${tasks.length} 个任务处理信息`,
          HttpStatus.BAD_REQUEST
        );
      }

      // 验证所有任务ID是否都在未完成任务列表中
      const incompleteTaskIds = new Set(incompleteTasks.map(t => t.task_id));
      const providedTaskIds = new Set(tasks.map(t => t.task_id));
      
      if (incompleteTaskIds.size !== providedTaskIds.size || 
          [...incompleteTaskIds].some(id => !providedTaskIds.has(id))) {
        throw new HttpException('提供的任务ID与当日未完成任务不匹配', HttpStatus.BAD_REQUEST);
      }

      const nextDayNo = dateNo + 1;
      const now = new Date();
      let skippedCount = 0;
      let postponedCount = 0;
      const postponedTasks: Array<{ scheduler: any }> = [];

      // 循环处理每个任务
      for (const taskInfo of tasks) {
        const scheduler = incompleteTasks.find(t => t.task_id === taskInfo.task_id);
        if (!scheduler) {
          continue; // 已经验证过，这里应该不会发生
        }

        if (taskInfo.action === 'skip') {
          // 跳过任务：标记为SKIP状态
          await tx.userTask.update({
            where: { id: scheduler.task_id },
            data: {
              status: TaskStatus.SKIP,
            },
          });

          await tx.userTaskScheduler.update({
            where: { task_id: scheduler.task_id },
            data: {
              status: TaskStatus.SKIP,
            },
          });

          // 记录日志
          await tx.userTaskLog.create({
            data: {
              user_task_id: scheduler.task_id,
              from_status: scheduler.task.status,
              to_status: TaskStatus.SKIP,
              created_at: now,
            },
          });

          skippedCount++;
        } else if (taskInfo.action === 'postpone') {
          // 延期任务：先记录，稍后统一处理
          postponedTasks.push({
            scheduler,
          });
        }
      }

      // 处理延期任务：按原 day_sort 升序排序，保证推迟到次日后的顺序与当日一致（听P1、看P1、做P1）
      // moveTaskToNextDayTop 每次插入到次日顶端，因此需要按 day_sort 从大到小处理，这样原顺序最小的最后插入、排在次日最前
      const sortedPostponed = [...postponedTasks].sort(
        (a, b) => b.scheduler.day_sort - a.scheduler.day_sort
      );
      const tasksNeedAutoFill = needAutoFill ? sortedPostponed : [];
      const tasksNoAutoFill = needAutoFill ? [] : sortedPostponed;

      // 先处理不填满时间的任务（简单移动）
      for (const { scheduler } of tasksNoAutoFill) {
        await this.moveTaskToNextDayTop(tx, scheduler, dateNo);
        postponedCount++;
      }

      // 再处理需要填满时间的任务（移动并触发联动）
      for (const { scheduler } of tasksNeedAutoFill) {
        await this.moveTaskToNextDayTop(tx, scheduler, dateNo);
        postponedCount++;
      }

      // 重建计划顺序（所有移动任务后统一重建）
      await this.rebuildPlanOrders(tx, planId);

      // 更新时间限制（在重建顺序后更新）
      if (postponedTasks.length > 0) {
        // 更新次日时间限制
        const nextDayLimit = await this.getDayLimitFromTrack(tx, planId, nextDayNo);
        if (nextDayLimit !== null) {
          const nextDayTasks = await tx.userTaskScheduler.findMany({
            where: {
              plan_id: planId,
              date_no: nextDayNo,
            },
            include: {
              task: true,
            },
          });
          const nextDayTotalTime = nextDayTasks.reduce(
            (sum, item) => sum + (item.task?.occupation_time || 0),
            0
          );
          await this.updatePlanDayTrackLimit(tx, planId, nextDayNo, nextDayTotalTime);
        }

        // 更新当日时间限制
        const todayLimit = await this.getDayLimitFromTrack(tx, planId, dateNo);
        if (todayLimit !== null) {
          const todayTasks = await tx.userTaskScheduler.findMany({
            where: {
              plan_id: planId,
              date_no: dateNo,
            },
            include: {
              task: true,
            },
          });
          const todayTotalTime = todayTasks.reduce(
            (sum, item) => sum + (item.task?.occupation_time || 0),
            0
          );
          await this.updatePlanDayTrackLimit(tx, planId, dateNo, todayTotalTime);
        }

        // 对于需要填满时间的任务，处理次日可能的超时问题（触发后续任务联动移动）
        if (tasksNeedAutoFill.length > 0) {
          await this.handleDayOverflow(tx, {
            planId: planId,
            dayNo: nextDayNo,
            plan: plan,
          });
        }
      }

      // 所有任务处理完毕后，标记当日为已完成
      const nowFinish = new Date();
      const existingTrack = await tx.userPlanDayTrack.findFirst({
        where: {
          plan_id: planId,
          date_no: dateNo,
        },
      });

      if (existingTrack) {
        await tx.userPlanDayTrack.update({
          where: { id: existingTrack.id },
          data: {
            is_complete: true,
            completed_at: nowFinish,
          },
        });
      } else {
        const todayTasksForStat = await tx.userTaskScheduler.findMany({
          where: {
            plan_id: planId,
            date_no: dateNo,
          },
          include: { task: true },
        });
        const totalTime = todayTasksForStat.reduce(
          (sum, item) => sum + (item.task?.occupation_time || 0),
          0
        );
        await tx.userPlanDayTrack.create({
          data: {
            plan_id: planId,
            date_no: dateNo,
            is_complete: true,
            completed_at: nowFinish,
            total_time: totalTime,
          },
        });
      }
      

      return {
        success: true,
        skippedCount,
        postponedCount,
      };
    });
  }

  //  提前次日指定任务到今日
  async advanceNextDayTasks(
    userId: number,
    planId: number,
    dateNo: number,
    nextDayTaskIds: number[],
    needAutoFill: boolean
  ) {
    return await this.prismaService.$transaction(async (tx) => {
      // 验证计划属于该用户
      const plan = await tx.userPlan.findUnique({
        where: { id: planId },
      });
      if (!plan) {
        throw new Error('计划不存在');
      }
      if (plan.user_id !== userId) {
        throw new Error('计划不属于当前用户');
      }

      const nextDayNo = dateNo + 1;
      const todayTrack = await this.ensurePlanDayTrack(tx, planId, dateNo);

      // 获取次日要移动的任务
      const tasksToMove = await tx.userTaskScheduler.findMany({
        where: {
          plan_id: planId,
          date_no: nextDayNo,
          task_id: { in: nextDayTaskIds },
        },
        include: {
          task: true,
        },
        orderBy: { day_sort: 'asc' },
      });

      if (tasksToMove.length === 0) {
        throw new Error('未找到要移动的任务');
      }

      // 计算要移动任务的总时间
      const totalTimeToMove = tasksToMove.reduce(
        (sum, item) => sum + (item.task?.occupation_time || 0),
        0
      );

      // 获取今日当前时间限制（从UserPlanDayTrack）
      const todayLimit = await this.getDayLimitFromTrack(tx, planId, dateNo);
      
      // 如果今日有时间限制,更新今日时间限制（增加移动任务的时间）
      if (todayLimit !== null) {
        const newTodayLimit = todayLimit + totalTimeToMove;
        await this.updatePlanDayTrackLimit(tx, planId, dateNo, newTodayLimit);
      } else {
        // 如果没有记录，创建一条记录
        await tx.userPlanDayTrack.create({
          data: {
            plan_id: planId,
            date_no: dateNo,
            total_time: totalTimeToMove,
            is_complete: false,
          },
        });
      }

      // 获取今日队尾的day_sort
      const todayLastSort = await tx.userTaskScheduler.findFirst({
        where: {
          plan_id: planId,
          date_no: dateNo,
        },
        orderBy: { day_sort: 'desc' },
        select: { day_sort: true },
      });
      let nextDaySort = todayLastSort ? todayLastSort.day_sort + 1 : 1;

      // 移动任务到今日队尾
      for (const schedulerTask of tasksToMove) {
        // 调整原日期其他任务的day_sort
        await tx.userTaskScheduler.updateMany({
          where: {
            plan_id: planId,
            date_no: nextDayNo,
            day_sort: { gt: schedulerTask.day_sort },
          },
          data: {
            day_sort: { decrement: 1 },
          },
        });

        // 更新任务到今日
        await tx.userTaskScheduler.update({
          where: { task_id: schedulerTask.task_id },
          data: {
            date_no: dateNo,
            day_sort: nextDaySort,
            track_id: todayTrack.id,
          },
        });

        nextDaySort += 1;
      }

      if (!needAutoFill) {
        // 仅移动模式：更新次日时间限制为移动后的最新总时间
        const remainingNextDayTasks = await tx.userTaskScheduler.findMany({
          where: {
            plan_id: planId,
            date_no: nextDayNo,
          },
          include: {
            task: true,
          },
        });
        const remainingTime = remainingNextDayTasks.reduce(
          (sum, item) => sum + (item.task?.occupation_time || 0),
          0
        );
        // 即使次日原本没有时间限制,也设置为剩余任务的总时间
        await this.updatePlanDayTrackLimit(tx, planId, nextDayNo, remainingTime);
        
        // 重建计划顺序
        await this.rebuildPlanOrders(tx, planId);
        return { success: true, movedCount: tasksToMove.length };
      }

      // 移动且填充时间模式：自动规划补全后面的每一天任务情况
      // 先重建计划顺序
      await this.rebuildPlanOrders(tx, planId);

      // 处理今日可能的超时问题
      await this.handleDayOverflow(tx, {
        planId: planId,
        dayNo: dateNo,
        plan: plan,
      });

      return { success: true, movedCount: tasksToMove.length };
    });
  }

  //  更新计划某日的时间限制（更新UserPlanDayTrack）
  private async updatePlanDayTrackLimit(prismaService, planId: number, dayNo: number, newLimit: number) {
    const existingTrack = await prismaService.userPlanDayTrack.findFirst({
      where: {
        plan_id: planId,
        date_no: dayNo,
      },
    });

    if (existingTrack) {
      await prismaService.userPlanDayTrack.update({
        where: { id: existingTrack.id },
        data: { total_time: newLimit },
      });
    } else {
      await prismaService.userPlanDayTrack.create({
        data: {
          plan_id: planId,
          date_no: dayNo,
          total_time: newLimit,
          is_complete: false,
        },
      });
    }
  }

  async findById(id: number) {
    const task = await this.prismaService.userTask.findUnique({
      where: {
        id: id
      },
      include: {
        group: true
      }
    });
    if (!task) throw new Error('任务不存在');

    const now = moment();
    const lastHb = task.last_heartbeat_at ? moment(task.last_heartbeat_at) : null;

    // 异常退出标识：PAUSE 且 ≥ 90 s 无心跳（true表示任务可能异常退出而非正常暂停）
    task['last_off_line'] = (task.status === TaskStatus.PAUSE && lastHb !== null && now.diff(lastHb, 'seconds') >= 90);
    return task;
  }

  async create(userId: number, dto: UserTaskCreateDto, needAutoPlan: boolean, needAutoFill: boolean) {
    
    await this.prismaService.$transaction(async (tx) => {
      const task = await tx.userTask.create({
        data: {
          user_id: userId,
          plan_id: dto.plan_id,
          name: dto.name,
          status: dto.status,
          preset_task_tag_id: dto.preset_task_tag_id,
          task_group_id: dto.task_group_id || null,
          background: dto.background,
          suggested_time_start: dto.suggested_time_start,
          suggested_time_end: dto.suggested_time_end,
          remark: dto.remark,
          annex_type: dto.annex_type,
          annex: dto.annex,
          timing_type: dto.timing_type,
          occupation_time: dto.occupation_time,
          can_divisible: dto.can_divisible ?? true,
        },
      });

      const schedulerDateNo = dto.UserTaskScheduler.date_no || 1;
      const track = await this.ensurePlanDayTrack(tx, dto.plan_id, schedulerDateNo);

      const schedulerData: any = {
        plan_id: dto.plan_id,
        task_id: task.id,
        track_id: track.id,
        priority: dto.UserTaskScheduler.priority,
        global_sort: dto.UserTaskScheduler.global_sort,
        group_sort: dto.UserTaskScheduler.group_sort,
        day_sort: dto.UserTaskScheduler.day_sort,
        date_no: schedulerDateNo,
        can_divisible: dto.can_divisible,
      };

      const scheduler = await tx.userTaskScheduler.create({ data: schedulerData });

      // 新增任务后，当日 day_sort >= 新任务的任务都要后移
      const shiftDaySort = () =>
        tx.userTaskScheduler.updateMany({
          where: {
            plan_id: dto.plan_id,
            date_no: scheduler.date_no,
            day_sort: { gte: scheduler.day_sort },
            task_id: { not: task.id },
          },
          data: {
            day_sort: { increment: 1 },
          },
        });

      // 若是任务集任务，同任务集内 group_sort >= 新任务的任务都要后移，避免重复顺序
      const shiftGroupSort = () => {
        if (dto.task_group_id == null || scheduler.group_sort == null) return Promise.resolve();
        return tx.userTaskScheduler.updateMany({
          where: {
            plan_id: dto.plan_id,
            task: { task_group_id: dto.task_group_id },
            group_sort: { gte: scheduler.group_sort },
            task_id: { not: task.id },
          },
          data: {
            group_sort: { increment: 1 },
          },
        });
      };

      // 如果不需要自动规划或者不需要填充时间，只调整当天 day_sort 和任务集内 group_sort
      if (!needAutoPlan || !needAutoFill) {
        await shiftDaySort();
        await shiftGroupSort();
        return;
      }

      // 如果需要自动规划并且需要填充时间，先调整当天 day_sort 和任务集内 group_sort
      await shiftDaySort();
      await shiftGroupSort();

      // 然后检查当日时间限制
      const plan = await tx.userPlan.findUnique({
        where: { id: dto.plan_id },
      });
      if (!plan) {
        throw new Error('计划不存在');
      }

      const dayLimit = await this.getDayLimitFromTrack(tx, dto.plan_id, scheduler.date_no);
      if (dayLimit === null) {
        // 没有时间限制，已经调整完 day_sort，直接返回
        return;
      }

      // 插入任务后，检查并处理超时（递归处理被影响的天）
      await this.handleDayOverflow(tx, {
        planId: dto.plan_id,
        dayNo: scheduler.date_no,
        plan: plan,
      });
    });
  }

  /**
   * 用户手动把一个任务拆分成两个任务
   * - 传入 taskId、第一段信息（名称+分钟）、第二段信息（名称+分钟）
   * - 原任务变成第一段，新建一个任务作为第二段
   * - 当日剩余任务顺序往后顺延
   * - 所属计划内后续任务的 global_sort 顺延
   * - 如果是任务集任务，则后续任务的 group_sort 也顺延
   */
  async splitTask(
    userId: number,
    taskId: number,
    first: { name: string; minutes: number },
    second: { name: string; minutes: number },
  ) {
    if (first.minutes <= 0 || second.minutes <= 0) {
      throw new HttpException('拆分后的任务时长必须大于 0 分钟', HttpStatus.BAD_REQUEST);
    }

    return this.prismaService.$transaction(async (tx) => {
      // 1. 读取任务及调度信息
      const scheduler = await tx.userTaskScheduler.findUnique({
        where: { task_id: taskId },
        include: { task: true },
      });

      if (!scheduler || !scheduler.task) {
        throw new HttpException('任务不存在', HttpStatus.BAD_REQUEST);
      }
      if (scheduler.task.user_id !== userId) {
        throw new HttpException('无权操作该任务', HttpStatus.FORBIDDEN);
      }

      const task = scheduler.task;

      // 校验拆分时长总和是否与原任务一致，避免计划统计混乱
      if (first.minutes + second.minutes !== task.occupation_time) {
        throw new HttpException(
          `两段时长之和必须等于原任务时长（${task.occupation_time} 分钟）`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // 2. 更新原任务为第一段
      await tx.userTask.update({
        where: { id: task.id },
        data: {
          name: first.name,
          occupation_time: first.minutes,
        },
      });

      // 3. 为第二段创建一个新的任务，除名称和时长外其他信息保持一致
      const newTask = await tx.userTask.create({
        data: {
          plan_id: task.plan_id,
          user_id: task.user_id,
          task_group_id: task.task_group_id,
          name: second.name,
          preset_task_tag_id: task.preset_task_tag_id,
          background: task.background,
          suggested_time_start: task.suggested_time_start,
          suggested_time_end: task.suggested_time_end,
          remark: task.remark,
          annex_type: task.annex_type,
          annex: task.annex,
          timing_type: task.timing_type,
          occupation_time: second.minutes,
          status: task.status,
          can_divisible: task.can_divisible,
        },
      });

      // 4. 顺延当日 / 计划 / 任务集内后续任务的排序
      // 当天 within same date_no：day_sort > 当前任务的全部 +1
      await tx.userTaskScheduler.updateMany({
        where: {
          plan_id: scheduler.plan_id,
          date_no: scheduler.date_no,
          day_sort: { gt: scheduler.day_sort },
        },
        data: {
          day_sort: { increment: 1 },
        },
      });

      // 计划全局顺序：global_sort > 当前任务的全部 +1
      await tx.userTaskScheduler.updateMany({
        where: {
          plan_id: scheduler.plan_id,
          global_sort: { gt: scheduler.global_sort },
        },
        data: {
          global_sort: { increment: 1 },
        },
      });

      // 任务集顺序：如果有 group_sort，则将更大的 group_sort 顺延
      if (scheduler.group_sort !== null) {
        await tx.userTaskScheduler.updateMany({
          where: {
            plan_id: scheduler.plan_id,
            group_sort: { gt: scheduler.group_sort },
          },
          data: {
            group_sort: { increment: 1 },
          },
        });
      }

      // 5. 创建第二段对应的调度记录，插在原任务之后
      const newSchedulerData: any = {
        plan_id: scheduler.plan_id,
        task_id: newTask.id,
        track_id: scheduler.track_id,
        priority: scheduler.priority,
        global_sort: scheduler.global_sort + 1,
        group_sort: scheduler.group_sort !== null ? scheduler.group_sort + 1 : null,
        day_sort: scheduler.day_sort + 1,
        can_divisible: scheduler.can_divisible,
        date_no: scheduler.date_no,
        status: scheduler.status,
      };

      await tx.userTaskScheduler.create({ data: newSchedulerData });

      return { ok: true };
    });
  }

  async update(id: number, dto: UserTaskUpdateDto, userId: number) {
    const task = await this.prismaService.userTask.findFirst({
      where: {
        id: id,
      }
    });
    if (task.user_id !== userId) {
      throw new Error('未找到该任务信息/该任务不属于当前请求用户');
    }
    return this.prismaService.userTask.update({
      data: dto,
      where: {
        id: id,
      },
    });
  }

  //  编辑用户任务基础信息（不涉及排序）
  async updateBaseInfo(id: number, dto: UserTaskBaseUpdateDto, userId: number) {
    const scheduler = await this.prismaService.userTaskScheduler.findUnique({
      where: { task_id: id },
      include: { task: true },
    });
    if (!scheduler || !scheduler.task) {
      throw new Error('任务不存在');
    }
    if (scheduler.task.user_id !== userId) {
      throw new Error('未找到该任务信息/该任务不属于当前请求用户');
    }

    const oldOccupationTime = scheduler.task.occupation_time;
    const oldPriority = scheduler.priority;
    const planId = scheduler.plan_id;
    const dayNo = scheduler.date_no;

    const txRes = await this.prismaService.$transaction(async (tx) => {

      // 更新调度优先级
      await tx.userTaskScheduler.update({
        where: { task_id: id },
        data: {
          priority: dto.priority,
        },
      });
      // 更新任务基础信息
      await tx.userTask.update({
        where: { id },
        data: {
          name: dto.name,
          background: dto.background,
          occupation_time: dto.occupation_time,
          suggested_time_start: dto.suggested_time_start,
          suggested_time_end: dto.suggested_time_end,
          remark: dto.remark,
          annex_type: dto.annex_type as TaskAnnexType,
          annex: dto.annex,
          preset_task_tag_id: dto.preset_task_tag_id,
          timing_type: dto.timing_type,
        },
      });

      return { ok: true };
    });

    // 如果任务占用时间 / 优先级有变动，则触发自动规划（不允许改动已完成打卡的日）
    const needReplan = dto.occupation_time !== oldOccupationTime || dto.priority !== oldPriority;
    if (needReplan) {
      const track = await this.prismaService.userPlanDayTrack.findFirst({
        where: { plan_id: planId, date_no: dayNo },
        select: { is_complete: true, total_time: true },
      });
      if (!track?.is_complete) {
        const dayLimit = track?.total_time ?? 0;
        // 传入原本的日上限，不改变 limit_hour，仅触发重排/拆分/填充/总天数重算
        await this.planService.changeDayLimitHour(userId, planId, dayNo, dayLimit, false);
      }
    }

    return txRes;
  }


  //  用户删除单个任务
  async delete(userId: number, taskId: number, needAutoPlan: boolean, needAutoFill: boolean) {
    const scheduler = await this.prismaService.userTaskScheduler.findUnique({
      where: { task_id: taskId },
      include: {
        task: true,
      },
    });
    if (!scheduler) {
      throw new Error('任务不存在');
    }
    if (scheduler.task.user_id !== userId) {
      throw new Error('未找到该任务信息/该任务不属于当前请求用户');
    }

    await this.prismaService.$transaction(async (tx) => {
      const schedulerForTx = await tx.userTaskScheduler.findUnique({
        where: { task_id: taskId },
        include: { task: true },
      });
      if (!schedulerForTx) {
        throw new Error('任务不存在');
      }
      if (needAutoPlan) {
        await this.handleAutoPlanDeletion(tx, schedulerForTx, needAutoFill);
      } else {
        await this.moveTaskDecrement(tx, schedulerForTx);
        await tx.userTaskScheduler.delete({
          where: { task_id: taskId },
        });
      }

      await tx.userTask.delete({
        where: { id: taskId },
      });
    }, {
      maxWait: 5000,
      timeout: 30000,
    });
    return await this.prismaService.userPlan.findUnique({
        where: {
          id: scheduler.plan_id
        },
        include: {
          UserTask: {
            include: {
              UserTaskScheduler: true
            }
          }
        }
      })
  }

  //  删除任务后向前移动所有位置顺
  async moveTaskDecrement(prismaService, task: {task_id: number, plan_id: number, global_sort: number, group_sort:number, day_sort: number, date_no: number}){
      //  移动任务流位置
      if (task.group_sort !== null) {
        await prismaService.userTaskScheduler.updateMany({
          where: {
            plan_id: task.plan_id,
            group_sort: { gt: task.group_sort }
          },
          data: {
            group_sort: { decrement: 1 }  // 获取同一个group中，group_sort大于被删任务的所有任务，顺序向前移动一位
          }
        });
      }
      //  移动当天顺序位置
      await prismaService.userTaskScheduler.updateMany({
        where: {
          plan_id: task.plan_id,
          date_no: task.date_no,
          day_sort: { gt: task.day_sort }
        },
        data: {
          day_sort: { decrement: 1 } // 获取同一个day中，day_sort大于被删任务的所有任务，顺序向前移动一位
        }
      });
      //  移动计划全局位置
      await prismaService.userTaskScheduler.updateMany({
        where: {
          plan_id: task.plan_id,
          global_sort: { gt: task.global_sort }
        },
        data: {
          global_sort: { decrement: 1 } // 获取同一个plan中，global_sort大于被删任务的所有任务，顺序向前移动一位
        }
      });
  }
  
  //  用户学习过程-修改单个任务状态
  async changeTaskStatus(
    taskId: number,
    status: TaskStatus,
    userId: number,
    options?: { needContinuation?: boolean; continuationPercentage?: number },
  ) {
    return await this.prismaService.$transaction(async tx => {

      const task = await tx.userTask.findFirst({
        where: { id: taskId, user_id: userId },
        include: {
          UserTaskScheduler: true,
        },
      });
      if (!task) throw new Error('任务不存在或无权限');
      if (task.status in [TaskStatus.COMPLETE]) {
        throw new Error('任务已结束，不可再变更');
      }

      //  同时只可开始一个任务
      if (task.status == TaskStatus.WAITING && status === TaskStatus.PROGRESS){
        const dayTasks = await tx.userTaskScheduler.findMany({
          where: {
            plan_id: task.plan_id,
            date_no: task.UserTaskScheduler[0].date_no,
            status: {in: [TaskStatus.PROGRESS, TaskStatus.PAUSE] },
          },
        });
        if (dayTasks.length > 0) {
          throw new Error('当日还有未完成的任务，无法开始新任务');
        }
      }

      const valid: Record<TaskStatus, TaskStatus[]> = {
        [TaskStatus.WAITING]: [TaskStatus.PROGRESS, TaskStatus.SKIP],
        [TaskStatus.PROGRESS]: [TaskStatus.PAUSE, TaskStatus.COMPLETE],
        [TaskStatus.PAUSE]: [TaskStatus.PROGRESS, TaskStatus.COMPLETE],
        [TaskStatus.COMPLETE]: [],
        [TaskStatus.SKIP]: [],
      };
      if (!valid[task.status].includes(status)) {
        throw new Error(`非法状态转换 ${task.status} -> ${status}`);
      }

      const now = new Date();
      const upd: any = { status };

      /* 1. 首次开始 */
      if (task.status === TaskStatus.WAITING && status === TaskStatus.PROGRESS) {
        upd.actual_time_start = task.actual_time_start ?? now;
        upd.segment_start     = now;
        upd.last_heartbeat_at = now;
      }

      /* 2. 暂停：累加当前段（分钟） */
      if (task.status === TaskStatus.PROGRESS && status === TaskStatus.PAUSE) {
        const min = Math.floor(moment(now).diff(moment(task.segment_start), 'seconds') / 60);
        upd.actual_time = (task.actual_time || 0) + Math.max(0, min);
      }

      /* 3. 恢复 */
      if (task.status === TaskStatus.PAUSE && status === TaskStatus.PROGRESS) {
        upd.segment_start     = now;
        upd.last_heartbeat_at = now;
      }

      /* 4. 完成：双路径补算 */
      if (status === TaskStatus.COMPLETE) {
        let total = task.actual_time || 0;
        /* 情况 A：在线完成 → 算当前段 */
        if (task.status === TaskStatus.PROGRESS) {
          const min = Math.floor(moment(now).diff(moment(task.segment_start), 'minutes'));
          total += Math.max(0, min);
        }
        /* 情况 B：离线后从 PAUSE 点【结束】→ 用 last_heartbeat 补算最后段 */
        if (task.status === TaskStatus.PAUSE && task.last_heartbeat_at && task.segment_start) {
          const min = Math.floor(moment(task.last_heartbeat_at).diff(moment(task.segment_start), 'minutes'));
          total += Math.max(0, min);
        }
        upd.actual_time     = total;
        upd.actual_time_end = now;
      }
      
      await tx.userTask.update({ where: { id: taskId }, data: upd });
      await tx.userTaskScheduler.update({ where: { task_id: taskId }, data: {
        status: status
      } });

      /* 6. 日志 */
      await tx.userTaskLog.create({
        data: {
          user_task_id: taskId,
          from_status : task.status,
          to_status   : status,
          created_at  : now,
        },
      });

      /* 7. 完成时可选：创建延续任务（名称+【延续】，占用时间=原任务*延续百分比，放在原任务后面） */
      if (status === TaskStatus.COMPLETE && options?.needContinuation === true) {
        const pct = options.continuationPercentage;
        if (pct == null || pct <= 0 || pct > 1) {
          throw new Error('需要延续时请提供有效的延续百分比（0~1 之间的小数，如 0.2、0.5）');
        }
        const newOccupationTime = Math.max(1, Math.floor(task.occupation_time * pct));
        const scheduler = task.UserTaskScheduler?.[0];
        if (!scheduler) {
          throw new Error('任务调度信息不存在，无法创建延续任务');
        }

        const newTask = await tx.userTask.create({
          data: {
            plan_id: task.plan_id,
            user_id: task.user_id,
            task_group_id: task.task_group_id,
            name: `${task.name}【延续】`,
            preset_task_tag_id: task.preset_task_tag_id,
            background: task.background,
            suggested_time_start: task.suggested_time_start,
            suggested_time_end: task.suggested_time_end,
            remark: task.remark,
            annex_type: task.annex_type,
            annex: task.annex,
            timing_type: task.timing_type,
            occupation_time: newOccupationTime,
            status: TaskStatus.WAITING,
            can_divisible: task.can_divisible,
          },
        });

        // 当日剩余任务 day_sort 后移，为延续任务腾出位置（原任务后面）
        await tx.userTaskScheduler.updateMany({
          where: {
            plan_id: scheduler.plan_id,
            date_no: scheduler.date_no,
            day_sort: { gt: scheduler.day_sort },
          },
          data: {
            day_sort: { increment: 1 },
          },
        });

        // 计划全局顺序：global_sort 后移
        await tx.userTaskScheduler.updateMany({
          where: {
            plan_id: scheduler.plan_id,
            global_sort: { gt: scheduler.global_sort },
          },
          data: {
            global_sort: { increment: 1 },
          },
        });

        // 任务集顺序：若有 group_sort，则同任务集内后续任务 group_sort 后移（仅同 task_group_id）
        if (scheduler.group_sort !== null && task.task_group_id != null) {
          await tx.userTaskScheduler.updateMany({
            where: {
              plan_id: scheduler.plan_id,
              task: { task_group_id: task.task_group_id },
              group_sort: { gt: scheduler.group_sort },
            },
            data: {
              group_sort: { increment: 1 },
            },
          });
        }

        await tx.userTaskScheduler.create({
          data: {
            plan_id: scheduler.plan_id,
            task_id: newTask.id,
            track_id: scheduler.track_id,
            priority: scheduler.priority,
            global_sort: scheduler.global_sort + 1,
            group_sort: scheduler.group_sort !== null ? scheduler.group_sort + 1 : null,
            day_sort: scheduler.day_sort + 1,
            can_divisible: scheduler.can_divisible,
            date_no: scheduler.date_no,
            status: TaskStatus.WAITING,
          },
        });
      }
    });
  }

  /* 学习心跳接口 */
  async heartbeat(taskId: number, userId: number) {
    const res = await this.prismaService.userTask.updateMany({
      where: {
        id: taskId,
        user_id: userId,
        status: TaskStatus.PROGRESS,
      },
      data: { last_heartbeat_at: new Date() },
    });
    if (res.count === 0) throw new Error('任务不存在或已结束');
    return { ok: true };
  }

  //  从UserPlanDayTrack获取每日时间限制
  private async getDayLimitFromTrack(prismaService: any, planId: number, dayNo: number): Promise<number | null> {
    const track = await prismaService.userPlanDayTrack.findFirst({
      where: {
        plan_id: planId,
        date_no: dayNo,
      },
      select: {
        total_time: true,
      },
    });
    return track ? track.total_time : null;
  }

  //  兼容方法：保留原有的resolvePlanDayLimit，但现在应该使用getDayLimitFromTrack
  //  这个方法仅用于向后兼容或处理没有UserPlanDayTrack记录的情况
  private resolvePlanDayLimit(limitHour: any, dayNo: number): number | null {
    if (!limitHour) return null;
    let parsed = limitHour;
    if (typeof limitHour === 'string') {
      try {
        parsed = JSON.parse(limitHour);
      } catch (e) {
        return null;
      }
    }
    if (Array.isArray(parsed)) {
      const val = parsed[dayNo - 1];
      return typeof val === 'number' ? val : null;
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const key = dayNo.toString();
      const val = parsed[key] ?? parsed[dayNo];
      return typeof val === 'number' ? val : null;
    }
    if (typeof parsed === 'number' && dayNo === 1) {
      return parsed;
    }
    return null;
  }

  private async handleAutoPlanDeletion(prismaService, scheduler, needAutoFill: boolean) {
    const plan = await prismaService.userPlan.findUnique({
      where: { id: scheduler.plan_id },
    });
    if (!plan) {
      throw new Error('计划不存在');
    }

    // 保存被删除任务的信息
    const deletedTaskMinutes = scheduler.task?.occupation_time || 0;
    const deletedTaskGroupId = scheduler.task?.task_group_id ?? null;
    const deletedGroupSort = scheduler.group_sort;

    await prismaService.userTaskScheduler.delete({
      where: { task_id: scheduler.task_id },
    });

    // 先把今日剩余任务向前提
    await this.compactDay(prismaService, scheduler.plan_id, scheduler.date_no, scheduler.day_sort);

    if (!needAutoFill) {
      await this.rebuildPlanOrders(prismaService, scheduler.plan_id);
      return;
    }

    const dayLimit = await this.getDayLimitFromTrack(prismaService, scheduler.plan_id, scheduler.date_no);
    if (dayLimit === null) {
      await this.rebuildPlanOrders(prismaService, scheduler.plan_id);
      return;
    }

    const dayTasks = await prismaService.userTaskScheduler.findMany({
      where: { plan_id: scheduler.plan_id, date_no: scheduler.date_no },
      include: { task: true },
      orderBy: { day_sort: 'asc' },
    });
    const occupiedMinutes = dayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
    const minutesNeeded = Math.max(dayLimit - occupiedMinutes, 0);

    const originalDayTaskIds = dayTasks.map(item => item.task_id);
    
    if (minutesNeeded > 0 && deletedTaskMinutes > 0) {
      await this.fillDayGap(prismaService, {
        planId: scheduler.plan_id,
        targetDayNo: scheduler.date_no,
        minutesNeeded: deletedTaskMinutes, // 使用被删除任务的时间
        deletedTaskGroupId,
        deletedGroupSort,
        originalDayTaskIds,
      });
    }

    await this.rebuildPlanOrders(prismaService, scheduler.plan_id, scheduler.date_no, originalDayTaskIds);
  }

  private async fillDayGap(prismaService, params: {
    planId: number;
    targetDayNo: number;
    minutesNeeded: number;
    deletedTaskGroupId: number | null;
    deletedGroupSort: number | null;
    originalDayTaskIds: number[];
  }) {
    const { planId, targetDayNo } = params;
    let remaining = params.minutesNeeded;
    if (remaining <= 0) return;

    const plan = await prismaService.userPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) return;

    const excludedTaskIds = new Set<number>();
    let nextDaySort = await prismaService.userTaskScheduler.count({
      where: { plan_id: planId, date_no: targetDayNo },
    }) + 1;

    while (remaining > 0) {
      let candidate = null;

      // 如果被删除的任务是任务集任务，则从同一任务集中找下一个任务
      // 注意：排除目标天的任务，因为这些任务已经在补全过程中被移过来了
      if (params.deletedTaskGroupId !== null && params.deletedGroupSort !== null) {
        candidate = await this.findNextTaskInGroup(prismaService, {
          planId,
          taskGroupId: params.deletedTaskGroupId,
          groupSort: params.deletedGroupSort,
          excludedTaskIds,
          targetDayNo: targetDayNo, // 排除目标天的任务
        });
      }

      // 如果不是任务集任务，或者任务集中找不到，则从次日的任务中选择优先度最高的任务
      if (!candidate) {
        candidate = await this.findBestCandidateFromNextDay(prismaService, {
          planId,
          targetDayNo,
          excludedTaskIds,
        });
      }

      // 如果仍然找不到候选任务，说明没有更多任务可以移动，退出循环
      if (!candidate) break;

      const duration = candidate.task?.occupation_time || 0;
      if (duration <= 0) {
        excludedTaskIds.add(candidate.task_id);
        continue;
      }

      // 记录被移动任务的原所在天和信息
      const movedFromDayNo = candidate.date_no;
      const movedTaskGroupId = candidate.task?.task_group_id ?? null;
      const movedGroupSort = candidate.group_sort;

      // 如果被删除的任务时间 < 挪过来的任务时间，需要切割
      if (duration > remaining) {
        const canSplit = candidate.can_divisible || candidate.task?.can_divisible;
        if (!canSplit) {
          excludedTaskIds.add(candidate.task_id);
          continue;
        }

        const newTaskId = await this.splitTaskForFill(
          prismaService,
          candidate,
          remaining,
          targetDayNo,
          nextDaySort,
        );
        if (!newTaskId) break;

        remaining = 0;
        nextDaySort += 1;
        break;
      }

      // 如果被删除的任务时间 >= 挪过来的任务时间，直接移动
      await this.moveSchedulerTask(prismaService, candidate, targetDayNo, nextDaySort);
      remaining -= duration;
      nextDaySort += 1;

      // 如果被删除的任务是任务集任务，更新group_sort游标
      if (params.deletedTaskGroupId !== null && candidate.task?.task_group_id === params.deletedTaskGroupId && candidate.group_sort !== null) {
        params.deletedGroupSort = candidate.group_sort;
      }

      // 如果任务是从其他天移过来的，需要递归补全原所在天
      // 关键：每移动一个任务后，立即完成该任务的所有连续操作（包括递归补全），
      // 这样就不会出现当某个日期被移动了多次以后，第二次开始不再补全的问题
      if (movedFromDayNo !== targetDayNo && movedFromDayNo > targetDayNo) {
        // 立即递归补全原所在天，确保完全补全后再继续
        // 注意：递归补全时，使用被移动任务的信息（如果是任务集任务，则从同一任务集找下一个；否则从次日选择）
        await this.recursivelyFillDayGap(prismaService, {
          planId,
          targetDayNo: movedFromDayNo,
          minutesNeeded: duration, // 使用被移动任务的时间（但recursivelyFillDayGap会重新计算实际需要的分钟数）
          deletedTaskGroupId: movedTaskGroupId, // 使用被移动任务的任务集ID
          deletedGroupSort: movedGroupSort, // 使用被移动任务的group_sort
          plan,
        });
      }
      
      // 继续循环，检查是否还需要补全
      // 注意：remaining可能已经为0，但循环会继续检查是否有新的候选任务
    }
  }

  // 递归补全某一天，确保完全补全后再返回
  private async recursivelyFillDayGap(prismaService, params: {
    planId: number;
    targetDayNo: number;
    minutesNeeded: number;
    deletedTaskGroupId: number | null;
    deletedGroupSort: number | null;
    plan: any;
  }) {
    const { planId, targetDayNo, minutesNeeded, deletedTaskGroupId, deletedGroupSort, plan } = params;
    
    const dayLimit = await this.getDayLimitFromTrack(prismaService, planId, targetDayNo);
    if (dayLimit === null) return;
    
    // 查询当前天的任务
    const dayTasks = await prismaService.userTaskScheduler.findMany({
      where: { plan_id: planId, date_no: targetDayNo },
      include: { task: true },
      orderBy: { day_sort: 'asc' },
    });
    
    const dayOccupied = dayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
    const dayNeeded = Math.max(dayLimit - dayOccupied, 0);
    
    if (dayNeeded <= 0) return; // 已经满了，不需要补全
    
    const originalDayTaskIds = dayTasks.map(item => item.task_id);
    
    // 使用fillDayGap进行补全
    await this.fillDayGap(prismaService, {
      planId,
      targetDayNo,
      minutesNeeded: dayNeeded, // 使用实际需要的分钟数
      deletedTaskGroupId,
      deletedGroupSort,
      originalDayTaskIds,
    });
  }

  private async splitTaskForFill(prismaService, candidate, minutesToMove: number, targetDayNo: number, daySort: number): Promise<number | null> {
    const task = candidate.task;
    if (!task || minutesToMove <= 0) return null;

    const total = task.occupation_time;
    const remain = total - minutesToMove;
    if (remain <= 0) {
      await prismaService.userTaskScheduler.update({
        where: { task_id: candidate.task_id },
        data: { date_no: targetDayNo, day_sort: daySort },
      });
      return candidate.task_id;
    }

    const baseName = this.normalizeTaskName(task.name || '');
    const fillName = `${baseName}(${minutesToMove}/${total})`;
    const remainName = `${baseName}(${remain}/${total})`;

    const newTask = await prismaService.userTask.create({
      data: {
        plan_id: task.plan_id,
        name: fillName,
        task_group_id: task.task_group_id,
        preset_task_tag_id: task.preset_task_tag_id,
        user_id: task.user_id,
        background: task.background,
        suggested_time_start: task.suggested_time_start,
        suggested_time_end: task.suggested_time_end,
        remark: task.remark,
        annex_type: task.annex_type,
        annex: task.annex,
        timing_type: task.timing_type,
        occupation_time: minutesToMove,
        status: task.status,
        can_divisible: task.can_divisible,
      },
    });

    const targetTrack = await this.ensurePlanDayTrack(prismaService, candidate.plan_id, targetDayNo);

    const schedulerData: any = {
      plan_id: candidate.plan_id,
      task_id: newTask.id,
      priority: candidate.priority,
      global_sort: candidate.global_sort,
      group_sort: candidate.group_sort,
      day_sort: daySort,
      can_divisible: candidate.can_divisible,
      date_no: targetDayNo,
      track_id: targetTrack.id,
      status: candidate.status,
    };

    await prismaService.userTaskScheduler.create({ data: schedulerData });

    await prismaService.userTask.update({
      where: { id: task.id },
      data: {
        occupation_time: remain,
        name: remainName,
      },
    });

    return newTask.id;
  }

  private normalizeTaskName(name: string): string {
    return name.replace(/\(\d+\/\d+\)\s*$/, '').trim();
  }

  private async compactDay(prismaService, planId: number, dayNo: number, deletedSort: number) {
    await prismaService.userTaskScheduler.updateMany({
      where: {
        plan_id: planId,
        date_no: dayNo,
        day_sort: { gt: deletedSort },
      },
      data: {
        day_sort: { decrement: 1 },
      },
    });
  }

  private async moveSchedulerTask(prismaService, schedulerTask, targetDayNo: number, daySort: number) {
    const targetTrack = await this.ensurePlanDayTrack(prismaService, schedulerTask.plan_id, targetDayNo);

    await prismaService.userTaskScheduler.updateMany({
      where: {
        plan_id: schedulerTask.plan_id,
        date_no: schedulerTask.date_no,
        day_sort: { gt: schedulerTask.day_sort },
      },
      data: {
        day_sort: { decrement: 1 },
      },
    });

    await prismaService.userTaskScheduler.update({
      where: { task_id: schedulerTask.task_id },
      data: {
        date_no: targetDayNo,
        day_sort: daySort,
        track_id: targetTrack.id,
        is_postpone: true, // 标记为被顺延
      } as any,
    });
  }

  // 从同一任务集中找下一个任务（group_sort更大的）
  // 注意：只查找不在目标天的任务，因为目标天的任务已经在补全过程中被移过来了
  private async findNextTaskInGroup(prismaService, params: {
    planId: number;
    taskGroupId: number;
    groupSort: number;
    excludedTaskIds: Set<number>;
    targetDayNo?: number; // 添加目标天参数，排除目标天的任务
  }) {
    const where: any = {
      plan_id: params.planId,
      task_id: { notIn: Array.from(params.excludedTaskIds) },
      task: { task_group_id: params.taskGroupId },
      group_sort: { gt: params.groupSort },
    };
    
    // 如果指定了目标天，排除目标天的任务（因为这些任务已经在补全过程中被移过来了）
    if (params.targetDayNo !== undefined) {
      where.date_no = { not: params.targetDayNo };
    }
    
    return prismaService.userTaskScheduler.findFirst({
      where,
      include: { task: true },
      orderBy: { group_sort: 'asc' },
    });
  }

  // 从次日的任务中选择优先度最高的任务（同等优先级下选择id更小的）
  private async findBestCandidateFromNextDay(prismaService, params: {
    planId: number;
    targetDayNo: number;
    excludedTaskIds: Set<number>;
  }) {
    return prismaService.userTaskScheduler.findFirst({
      where: {
        plan_id: params.planId,
        task_id: { notIn: Array.from(params.excludedTaskIds) },
        date_no: { gt: params.targetDayNo },
      },
      include: { task: true },
      orderBy: [
        { date_no: 'asc' },
        { priority: 'asc' },
        { task_id: 'asc' },
        { day_sort: 'asc' },
      ],
    });
  }

  // 处理某一天的超时问题，递归处理被影响的下一天
  private async handleDayOverflow(prismaService, params: {
    planId: number;
    dayNo: number;
    plan: any;
  }) {
    const { planId, dayNo, plan } = params;
    
    // 检查当天的时间限制（从UserPlanDayTrack）
    const dayLimit = await this.getDayLimitFromTrack(prismaService, planId, dayNo);
    
    // 如果当天是计划的最后一天，不需要处理时间限制
    const isLastDay = plan.total_days && dayNo >= plan.total_days;
    if (dayLimit === null || isLastDay) {
      // 没有时间限制，不需要处理，但需要检查下一天是否受影响
      const nextDayNo = dayNo + 1;
      const nextDayLimit = await this.getDayLimitFromTrack(prismaService, planId, nextDayNo);
      if (nextDayLimit !== null) {
        const nextDayTasks = await prismaService.userTaskScheduler.findMany({
          where: { plan_id: planId, date_no: nextDayNo },
          include: { task: true },
          orderBy: { day_sort: 'asc' },
        });
        const nextDayOccupied = nextDayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
        const nextDayExcess = nextDayOccupied - nextDayLimit;
        if (nextDayExcess > 0) {
          // 下一天也超时了，递归处理
          await this.handleDayOverflow(prismaService, {
            planId,
            dayNo: nextDayNo,
            plan,
          });
        }
      }
      return;
    }

    // 使用 while 循环处理当天的超时问题
    while (true) {
      // 重新读取当天所有任务（因为任务可能已经被移动或拆分）
      const dayTasks = await prismaService.userTaskScheduler.findMany({
        where: { plan_id: planId, date_no: dayNo },
        include: { task: true },
        orderBy: { day_sort: 'asc' },
      });
      
      // 计算当天已占用时间
      const occupiedMinutes = dayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
      const excessMinutes = occupiedMinutes - dayLimit;

      // 如果不超过时间限制，检查下一天是否受影响
      if (excessMinutes <= 0) {
        // 检查下一天是否超时（因为可能有任务被移到了下一天）
        const nextDayNo = dayNo + 1;
        const nextDayLimit = await this.getDayLimitFromTrack(prismaService, planId, nextDayNo);
        if (nextDayLimit !== null) {
          const nextDayTasks = await prismaService.userTaskScheduler.findMany({
            where: { plan_id: planId, date_no: nextDayNo },
            include: { task: true },
            orderBy: { day_sort: 'asc' },
          });
          const nextDayOccupied = nextDayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
          const nextDayExcess = nextDayOccupied - nextDayLimit;
          if (nextDayExcess > 0) {
            // 下一天也超时了，递归处理
            await this.handleDayOverflow(prismaService, {
              planId,
              dayNo: nextDayNo,
              plan,
            });
          }
        }
        return;
      }

      // 如果超时，需要挪走任务
      // 先检查下一天是否有时间限制，或者是否是最后一天
      const nextDayNo = dayNo + 1;
      const nextDayLimit = await this.getDayLimitFromTrack(prismaService, planId, nextDayNo);
      const isNextDayLastDay = plan.total_days && nextDayNo >= plan.total_days;
      
      // 如果下一天没有时间限制或者是最后一天，把所有超时的任务都移到下一天，不再拆分
      // 注意：如果是最后一天，即使有时间限制，也应该忽略，把所有任务都放在最后一天
      if (nextDayLimit === null || isNextDayLastDay) {
        // 循环移动任务，直到当天不超时
        while (true) {
          // 重新读取当天所有任务
          const currentDayTasks = await prismaService.userTaskScheduler.findMany({
            where: { plan_id: planId, date_no: dayNo },
            include: { task: true },
            orderBy: { day_sort: 'asc' },
          });
          
          const currentOccupied = currentDayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
          const currentExcess = currentOccupied - dayLimit;
          
          if (currentExcess <= 0) {
            // 已经不需要挪走更多任务了
            return;
          }
          
          // 从最低优先级开始逐层查找，相同优先级按 day_sort 倒序（靠后的先被挪走）
          const priorityOrder = [9999, 3, 2, 1]; // 无优先级(9999)、3级、2级、1级
          
          let foundTask = false;
          for (const priority of priorityOrder) {
            // 获取当前优先级的所有任务，按 day_sort 倒序排列（靠后的先被挪走）
            const tasksWithPriority = currentDayTasks
              .filter(item => item.priority === priority)
              .sort((a, b) => b.day_sort - a.day_sort); // 倒序，day_sort 大的在前（靠后的先被挪走）
            
            for (const schedulerTask of tasksWithPriority) {
              const taskDuration = schedulerTask.task?.occupation_time || 0;
              if (taskDuration <= 0) {
                continue;
              }

              // 如果需要移走的时间小于任务时间，且任务可以拆分，则拆分任务
              if (taskDuration > currentExcess) {
                const canSplit = schedulerTask.can_divisible || schedulerTask.task?.can_divisible;
                if (canSplit) {
                  // 拆分任务：将 currentExcess 移到下一天
                  await this.splitTaskForPostpone(
                    prismaService,
                    schedulerTask,
                    currentExcess,
                    dayNo,
                  );
                  foundTask = true;
                  break; // 跳出内层循环，重新检查
                }
              }

              // 如果任务时间 <= 需要挪走的时间，或者不能拆分，直接移动整个任务到次日最顶端
              await this.moveTaskToNextDayTop(prismaService, schedulerTask, dayNo);
              foundTask = true;
              break; // 跳出内层循环，重新检查
            }
            
            if (foundTask) {
              break; // 跳出外层循环，重新检查
            }
          }
          
          if (!foundTask) {
            // 没有找到可以移动的任务，退出循环
            return;
          }
        }
      }
      
      // 如果下一天有时间限制，按照原来的逻辑处理（可以拆分）
      // 从最低优先级开始逐层查找，相同优先级按 day_sort 倒序（靠后的先被挪走）
      const priorityOrder = [9999, 3, 2, 1]; // 无优先级(9999)、3级、2级、1级
      
      let foundTask = false;
      
      for (const priority of priorityOrder) {
        // 获取当前优先级的所有任务，按 day_sort 倒序排列
        const tasksWithPriority = dayTasks
          .filter(item => item.priority === priority)
          .sort((a, b) => b.day_sort - a.day_sort); // 倒序，day_sort 大的在前
        
        for (const schedulerTask of tasksWithPriority) {
          const taskDuration = schedulerTask.task?.occupation_time || 0;
          if (taskDuration <= 0) {
            continue;
          }

          // 如果需要挪走的时间小于任务时间，需要拆分任务
          if (taskDuration > excessMinutes) {
            const canSplit = schedulerTask.can_divisible || schedulerTask.task?.can_divisible;
            if (!canSplit) {
              // 不能拆分，跳过这个任务
              continue;
            }

            // 拆分任务：将 excessMinutes 移到下一天
            await this.splitTaskForPostpone(
              prismaService,
              schedulerTask,
              excessMinutes,
              dayNo,
            );
            foundTask = true;
            break; // 跳出内层循环，重新检查
          } else {
            // 如果任务时间 <= 需要挪走的时间，直接移动整个任务到次日最顶端
            await this.moveTaskToNextDayTop(prismaService, schedulerTask, dayNo);
            foundTask = true;
            break; // 跳出内层循环，重新检查
          }
        }
        
        if (foundTask) {
          break; // 跳出外层循环，重新检查
        }
      }
      
      // 如果没有找到可以挪走的任务，退出循环
      if (!foundTask) {
        // 检查下一天是否受影响
        const nextDayNo = dayNo + 1;
        const nextDayLimit = await this.getDayLimitFromTrack(prismaService, planId, nextDayNo);
        if (nextDayLimit !== null) {
          const nextDayTasks = await prismaService.userTaskScheduler.findMany({
            where: { plan_id: planId, date_no: nextDayNo },
            include: { task: true },
            orderBy: { day_sort: 'asc' },
          });
          const nextDayOccupied = nextDayTasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
          const nextDayExcess = nextDayOccupied - nextDayLimit;
          if (nextDayExcess > 0) {
            // 下一天也超时了，递归处理
            await this.handleDayOverflow(prismaService, {
              planId,
              dayNo: nextDayNo,
              plan,
            });
          }
        }
        return;
      }
    }
  }

  // 拆分任务用于推迟：将部分时间移到次日最顶端
  private async splitTaskForPostpone(prismaService, candidate, minutesToMove: number, currentDayNo: number) {
    const task = candidate.task;
    if (!task || minutesToMove <= 0) return;

    const total = task.occupation_time;
    const remain = total - minutesToMove;
    if (remain <= 0) {
      // 如果剩余时间 <= 0，直接移动整个任务
      await this.moveTaskToNextDayTop(prismaService, candidate, currentDayNo);
      return;
    }

    const baseName = this.normalizeTaskName(task.name || '');
    // 拆分出来的任务（移到下一天的）名称要体现是被拆出来的
    const moveName = `${baseName}【拆分】(${minutesToMove}/${total})`;
    // 原任务保留剩余部分
    const remainName = `${baseName}(${remain}/${total})`;

    // 创建新任务（需要移到次日的部分）
    const newTask = await prismaService.userTask.create({
      data: {
        user_id: task.user_id,
        plan_id: task.plan_id,
        name: moveName,
        status: task.status,
        preset_task_tag_id: task.preset_task_tag_id,
        task_group_id: task.task_group_id,
        background: task.background,
        suggested_time_start: task.suggested_time_start,
        suggested_time_end: task.suggested_time_end,
        remark: task.remark,
        annex_type: task.annex_type,
        annex: task.annex,
        timing_type: task.timing_type,
        occupation_time: minutesToMove,
        can_divisible: task.can_divisible,
      },
    });

    // 获取次日最顶端的 day_sort（应该是最小的，如果没有任务则为 1）
    const nextDayNo = currentDayNo + 1;
    const targetTrack = await this.ensurePlanDayTrack(prismaService, candidate.plan_id, nextDayNo);
    const nextDayTopSort = await prismaService.userTaskScheduler.findFirst({
      where: {
        plan_id: candidate.plan_id,
        date_no: nextDayNo,
      },
      orderBy: { day_sort: 'asc' },
      select: { day_sort: true },
    });
    const targetDaySort = nextDayTopSort ? nextDayTopSort.day_sort - 1 : 1;
    
    // 如果目标 day_sort <= 0，需要调整次日所有任务的 day_sort
    if (targetDaySort <= 0) {
      await prismaService.userTaskScheduler.updateMany({
        where: {
          plan_id: candidate.plan_id,
          date_no: nextDayNo,
        },
        data: {
          day_sort: { increment: 1 },
        },
      });
    }

    // 创建新任务的调度信息，放在次日最顶端
    const schedulerData: any = {
      plan_id: candidate.plan_id,
      task_id: newTask.id,
      priority: candidate.priority,
      global_sort: candidate.global_sort,
      group_sort: candidate.group_sort,
      day_sort: targetDaySort <= 0 ? 1 : targetDaySort,
      can_divisible: candidate.can_divisible,
      date_no: nextDayNo,
      track_id: targetTrack.id,
      status: candidate.status,
    };

    await prismaService.userTaskScheduler.create({ data: schedulerData });

    // 更新原任务，保留剩余部分
    await prismaService.userTask.update({
      where: { id: task.id },
      data: {
        occupation_time: remain,
        name: remainName,
      },
    });
    // 注意：拆分任务时，原任务还在当前天，只是减少了时间，所以不需要调整 day_sort
  }

  // 将任务移到次日最顶端
  private async moveTaskToNextDayTop(prismaService, schedulerTask, currentDayNo: number) {
    const nextDayNo = currentDayNo + 1;
    const targetTrack = await this.ensurePlanDayTrack(prismaService, schedulerTask.plan_id, nextDayNo);
    
    // 获取次日最顶端的 day_sort
    const nextDayTopSort = await prismaService.userTaskScheduler.findFirst({
      where: {
        plan_id: schedulerTask.plan_id,
        date_no: nextDayNo,
      },
      orderBy: { day_sort: 'asc' },
      select: { day_sort: true },
    });
    const targetDaySort = nextDayTopSort ? nextDayTopSort.day_sort - 1 : 1;
    
    // 如果目标 day_sort <= 0，需要调整次日所有任务的 day_sort
    if (targetDaySort <= 0) {
      await prismaService.userTaskScheduler.updateMany({
        where: {
          plan_id: schedulerTask.plan_id,
          date_no: nextDayNo,
        },
        data: {
          day_sort: { increment: 1 },
        },
      });
    }

    // 调整当前天其他任务的 day_sort（因为移除了这个任务）
    await prismaService.userTaskScheduler.updateMany({
      where: {
        plan_id: schedulerTask.plan_id,
        date_no: schedulerTask.date_no,
        day_sort: { gt: schedulerTask.day_sort },
      },
      data: {
        day_sort: { decrement: 1 },
      },
    });

    // 更新任务的 date_no 和 day_sort
    await prismaService.userTaskScheduler.update({
      where: { task_id: schedulerTask.task_id },
      data: {
        date_no: nextDayNo,
        day_sort: targetDaySort <= 0 ? 1 : targetDaySort,
        track_id: targetTrack.id,
        is_postpone: true, // 标记为被顺延
      } as any,
    });
  }

  private async rebuildPlanOrders(prismaService, planId: number, targetDayNo?: number, originalDayTaskIds?: number[]) {
    const schedulers = await prismaService.userTaskScheduler.findMany({
      where: { plan_id: planId },
      include: { task: { select: { task_group_id: true } } },
      orderBy: [
        { date_no: 'asc' },
        { day_sort: 'asc' },
        { global_sort: 'asc' },
      ],
    });

    let globalSort = 1;
    const groupCursor = new Map<number, number>();

    const byDate = schedulers.reduce((acc, s) => {
      if (!acc[s.date_no]) acc[s.date_no] = [];
      acc[s.date_no].push(s);
      return acc;
    }, {} as Record<number, typeof schedulers>);

    for (const dateNo of Object.keys(byDate).sort((a, b) => Number(a) - Number(b))) {
      const dayTasks = byDate[Number(dateNo)];
      let daySort = 1;

      if (targetDayNo !== undefined && Number(dateNo) === targetDayNo && originalDayTaskIds) {
        const originalTasks = dayTasks.filter(t => originalDayTaskIds.includes(t.task_id));
        const newTasks = dayTasks.filter(t => !originalDayTaskIds.includes(t.task_id));

        originalTasks.sort((a, b) => a.day_sort - b.day_sort);
        newTasks.sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return (a.task?.id || a.task_id) - (b.task?.id || b.task_id);
        });

        for (const scheduler of [...originalTasks, ...newTasks]) {
          let groupSort = null;
          const groupId = scheduler.task?.task_group_id ?? null;
          if (groupId !== null) {
            const next = (groupCursor.get(groupId) ?? 0) + 1;
            groupCursor.set(groupId, next);
            groupSort = next;
          }

          if (scheduler.day_sort !== daySort || scheduler.global_sort !== globalSort || scheduler.group_sort !== groupSort) {
            await prismaService.userTaskScheduler.update({
              where: { task_id: scheduler.task_id },
              data: {
                day_sort: daySort,
                global_sort: globalSort,
                group_sort: groupSort,
              },
            });
          }
          daySort += 1;
          globalSort += 1;
        }
      } else {
        for (const scheduler of dayTasks) {
          let groupSort = null;
          const groupId = scheduler.task?.task_group_id ?? null;
          if (groupId !== null) {
            const next = (groupCursor.get(groupId) ?? 0) + 1;
            groupCursor.set(groupId, next);
            groupSort = next;
          }

          if (scheduler.day_sort !== daySort || scheduler.global_sort !== globalSort || scheduler.group_sort !== groupSort) {
            await prismaService.userTaskScheduler.update({
              where: { task_id: scheduler.task_id },
              data: {
                day_sort: daySort,
                global_sort: globalSort,
                group_sort: groupSort,
              },
            });
          }
          daySort += 1;
          globalSort += 1;
        }
      }
    }
  }

  //  获取计划的每日进度信息
  async getPlanDayProgress(userId: number, planId: number, needTask: boolean) {
    // 验证计划属于该用户
    const plan = await this.prismaService.userPlan.findFirst({
      where: {
        id: planId,
        user_id: userId,
      }
    });
    if (!plan) {
      throw new Error('计划不存在或不属于当前用户');
    }

    // 获取所有每日跟踪记录
    const dayTracks = await this.prismaService.userPlanDayTrack.findMany({
      where: {
        plan_id: planId,
      },
      select: {
        date_no: true,
        is_complete: true,
        completed_at: true,
        total_time: true,
        UserTaskScheduler: {
          select: {
            track_id: true,
            day_sort: true,
            date_no: true,
            priority: true,
            is_postpone: true,
            task: {
              select: {
                id: true,
                name: true,
                background: true
              }
            }
          }
        }
      },
      orderBy: {
        date_no: 'desc',
      },
    });

    // 获取当前日期（相对于计划开始时间）
    // const now = moment();
    // const startTime = moment(plan.planned_start_time);
    // const currentDayNo = Math.max(1, now.diff(startTime, 'days') + 1);

    // 计算已完成的天数
    const completedDays = dayTracks.filter(track => track.is_complete).map(track => track.date_no);
    const completedDaysCount = completedDays.length;

    // 计算每天的任务完成情况
    const dayProgressList = [];
    for (let dayNo = 1; dayNo <= plan.total_days; dayNo++) {
      const track = dayTracks.find(t => t.date_no === dayNo);

      dayProgressList.push({
        date_no: dayNo,
        is_complete: track?.is_complete || false,
        completed_at: track?.completed_at || null,
        total_time: track?.total_time || null,
        taskList: needTask ? track?.UserTaskScheduler : [],
        is_postpone: track?.UserTaskScheduler.some(t => t.is_postpone) || false,
        // is_today: dayNo === currentDayNo,
      });
    }

    return {
      plan_id: planId,
      // current_day_no: currentDayNo,
      total_days: plan.total_days,
      completed_days: completedDays,
      completed_days_count: completedDaysCount,
      day_progress_list: dayProgressList,
    };
  }
}
