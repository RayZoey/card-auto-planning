/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-05-22 09:28:57
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-01-18 23:28:23
 * @FilePath: /water/src/timing-scheduler/timing-scheduler.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Inject, Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {Cron, CronExpression} from '@nestjs/schedule';
import {WINSTON_MODULE_PROVIDER} from 'nest-winston';
import {Logger} from 'winston';
import { TaskStatus } from '@prisma/client';
const moment = require('moment');

@Injectable()
export class TimingSchedulerService {
  constructor(
    private readonly prismaService: PrismaService,
    
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}


  // 检测用户异常任务状态 每 60s 扫一次
  @Cron(CronExpression.EVERY_MINUTE)
  async autoPauseStale() {
    try {
      const now = moment();
      const staleThreshold = moment().subtract(90, 's').toDate(); // 90s 未更新心跳
      
      const staleTasks = await this.prismaService.userTask.findMany({
        where: {
          status: TaskStatus.PROGRESS,
          last_heartbeat_at: { lt: staleThreshold },
        },
        include: {
          UserTaskScheduler: {
            take: 1,
          },
        },
      });

      for (const task of staleTasks) {
        try {
          // 计算包含当前段的实际耗时
          const baseActualTime = task.actual_time || 0;
          let currentSegmentMinutes = 0;
          
          if (task.segment_start && task.last_heartbeat_at) {
            const segmentStart = moment(task.segment_start);
            const lastHeartbeat = moment(task.last_heartbeat_at);
            
            // 检查时间逻辑：segment_start 应该在 last_heartbeat_at 之前
            if (segmentStart.isAfter(lastHeartbeat)) {
              this.logger.warn(`任务 ${task.id} 数据异常：segment_start (${segmentStart.format()}) 晚于 last_heartbeat_at (${lastHeartbeat.format()})`);
              // 使用 0 作为当前段时长，避免负数
              currentSegmentMinutes = 0;
            } else {
              currentSegmentMinutes = Math.floor(lastHeartbeat.diff(segmentStart, 'seconds') / 60);
              currentSegmentMinutes = Math.max(0, currentSegmentMinutes);
            }
          }
          
          const totalActualTimeIncludingCurrentSegment = baseActualTime + currentSegmentMinutes;
          const plannedOccupationTime = task.occupation_time || 0;
          const oneHourInMinutes = 60;
          
          // 如果计划耗时 <= 0，跳过自动完结逻辑（避免异常数据导致误判）
          if (plannedOccupationTime <= 0) {
            this.logger.warn(`任务 ${task.id} 的计划耗时异常：${plannedOccupationTime}，跳过自动完结判断`);
            // 仍然执行暂停逻辑
            await this.pauseTask(task, currentSegmentMinutes, now.toDate());
            continue;
          }
          
          // 判断1：当前实际耗时（包含当前段）是否已超过计划耗时1小时以上
          if (totalActualTimeIncludingCurrentSegment >= plannedOccupationTime + oneHourInMinutes) {
            await this.completeTask(task, totalActualTimeIncludingCurrentSegment, now.toDate());
            this.logger.info(`任务 ${task.id} (实际耗时 ${totalActualTimeIncludingCurrentSegment}min) 超过计划耗时1小时以上，自动完结。`);
            continue;
          }
          
          // 判断2：实际耗时 + 预测中断耗时是否超过计划耗时1小时以上
          if (!task.last_heartbeat_at) {
            this.logger.warn(`任务 ${task.id} 没有 last_heartbeat_at，跳过预测耗时计算`);
            await this.pauseTask(task, currentSegmentMinutes, now.toDate());
            continue;
          }
          
          const predictedInterruptionDuration = Math.floor(
            now.diff(moment(task.last_heartbeat_at), 'seconds') / 60
          );
          const totalPredictedTime = totalActualTimeIncludingCurrentSegment + predictedInterruptionDuration;
          
          if (totalPredictedTime >= plannedOccupationTime + oneHourInMinutes) {
            await this.completeTask(task, totalPredictedTime, now.toDate());
            this.logger.info(`任务 ${task.id} (预测总耗时 ${totalPredictedTime}min) 超过计划耗时1小时以上，自动完结。`);
            continue;
          }
          
          // 如果不满足上述条件，则暂停任务（原逻辑）
          await this.pauseTask(task, currentSegmentMinutes, now.toDate());
          this.logger.info(`任务 ${task.id} 90s 未心跳，自动暂停。`);
        } catch (error) {
          this.logger.error(`处理任务 ${task.id} 失败: ${error.message}`, error.stack);
        }
      }
    } catch (error) {
      this.logger.error(`autoPauseStale 失败: ${error.message}`, error.stack);
    }
  }

  private async completeTask(task: any, actualTime: number, endTime: Date) {
    return await this.prismaService.$transaction(async (tx) => {
      // 再次检查任务状态，避免并发修改
      const currentTask = await tx.userTask.findUnique({
        where: { id: task.id },
        select: { status: true },
      });
      
      if (!currentTask || currentTask.status !== TaskStatus.PROGRESS) {
        this.logger.info(`任务 ${task.id} 状态已变更（当前：${currentTask?.status}），跳过自动完结`);
        return;
      }
      
      await tx.userTask.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.COMPLETE,
          actual_time: actualTime,
          actual_time_end: endTime,
          segment_start: null, // 重置段开始时间
        },
      });
      
      const scheduler = await tx.userTaskScheduler.findUnique({
        where: { task_id: task.id },
      });
      
      if (scheduler) {
        await tx.userTaskScheduler.update({
          where: { task_id: task.id },
          data: { status: TaskStatus.COMPLETE },
        });
      } else {
        this.logger.warn(`任务 ${task.id} 没有找到对应的 UserTaskScheduler`);
      }
      
      await tx.userTaskLog.create({
        data: {
          user_task_id: task.id,
          from_status: TaskStatus.PROGRESS,
          to_status: TaskStatus.COMPLETE,
          created_at: endTime,
        },
      });
    });
  }

  private async pauseTask(task: any, segmentDuration: number, pauseTime: Date) {
    return await this.prismaService.$transaction(async (tx) => {
      // 再次检查任务状态，避免并发修改
      const currentTask = await tx.userTask.findUnique({
        where: { id: task.id },
        select: { status: true },
      });
      
      if (!currentTask || currentTask.status !== TaskStatus.PROGRESS) {
        this.logger.info(`任务 ${task.id} 状态已变更（当前：${currentTask?.status}），跳过自动暂停`);
        return;
      }
      
      await tx.userTask.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.PAUSE,
          actual_time: (task.actual_time || 0) + Math.max(0, segmentDuration),
          segment_start: null, // 重置段开始时间
        },
      });
      
      const scheduler = await tx.userTaskScheduler.findUnique({
        where: { task_id: task.id },
      });
      
      if (scheduler) {
        await tx.userTaskScheduler.update({
          where: { task_id: task.id },
          data: { status: TaskStatus.PAUSE },
        });
      } else {
        this.logger.warn(`任务 ${task.id} 没有找到对应的 UserTaskScheduler`);
      }
      
      await tx.userTaskLog.create({
        data: {
          user_task_id: task.id,
          from_status: TaskStatus.PROGRESS,
          to_status: TaskStatus.PAUSE,
          created_at: pauseTime,
        },
      });
    });
  }

  //  每日3点自动关闭所有进行中的任务日，如果存在未完成的任务则顺延
  @Cron('0 3 * * *') // 每日凌晨3点执行
  async autoClosePreviousDayTasks() {
    try {
      const now = moment();
      const yesterday = moment().subtract(1, 'day');
      const yesterdayStart = yesterday.clone().startOf('day').toDate(); // 前一天00:00:00
      const yesterdayEnd = yesterday.clone().endOf('day').toDate(); // 前一天23:59:59

      this.logger.info(`开始执行自动关闭前一天任务，时间: ${now.format('YYYY-MM-DD HH:mm:ss')}`);

      // 1. 查找所有在前一个日历日（昨天）开始执行，但到今天凌晨3点还没有标记为完成的任务
      const progressTasks = await this.prismaService.userTask.findMany({
        where: {
          status: TaskStatus.PROGRESS,
          actual_time_start: {
            gte: yesterdayStart,
            lte: yesterdayEnd,
          },
        },
        include: {
          UserTaskScheduler: {
            include: {
              track: {
                include: {
                  plan: true,
                },
              },
            },
          },
        },
      });

      this.logger.info(`找到 ${progressTasks.length} 个前一天开始执行但未关闭的任务`);

      // 按计划分组处理
      const tasksByPlan = new Map<number, typeof progressTasks>();
      for (const task of progressTasks) {
        if (task.UserTaskScheduler && task.UserTaskScheduler.length > 0) {
          const planId = task.UserTaskScheduler[0].plan_id;
          if (!tasksByPlan.has(planId)) {
            tasksByPlan.set(planId, []);
          }
          tasksByPlan.get(planId)!.push(task);
        }
      }

      // 2. 处理每个计划
      for (const [planId, tasks] of tasksByPlan.entries()) {
        await this.prismaService.$transaction(async (tx) => {
          // 收集需要标记完成的计划日（track_id）
          const dayTracksToComplete = new Map<number, number>(); // trackId -> date_no

          // 关闭所有进行中的任务
          for (const task of tasks) {
            if (task.UserTaskScheduler && task.UserTaskScheduler.length > 0) {
              const scheduler = task.UserTaskScheduler[0];
              const trackId = scheduler.track_id;
              const dateNo = scheduler.date_no;
              dayTracksToComplete.set(trackId, dateNo);

              // 计算实际耗时（从segment_start到前一天结束）
              let actualTime = task.actual_time || 0;
              if (task.segment_start) {
                const segmentStart = moment(task.segment_start);
                const segmentEnd = moment(yesterdayEnd);
                const minutes = Math.floor(
                  segmentEnd.diff(segmentStart, 'seconds') / 60
                );
                actualTime += Math.max(0, minutes);
              }

              // 关闭任务
              await tx.userTask.update({
                where: { id: task.id },
                data: {
                  status: TaskStatus.COMPLETE,
                  actual_time: actualTime,
                  actual_time_end: yesterdayEnd,
                },
              });

              // 更新scheduler状态
              await tx.userTaskScheduler.update({
                where: { task_id: task.id },
                data: {
                  status: TaskStatus.COMPLETE,
                },
              });

              // 记录日志
              await tx.userTaskLog.create({
                data: {
                  user_task_id: task.id,
                  from_status: TaskStatus.PROGRESS,
                  to_status: TaskStatus.COMPLETE,
                  created_at: yesterdayEnd,
                },
              });
            }
          }

          // 3. 标记对应的计划日为完成，并检查这些计划日中是否有其他未完成任务需要顺延
          for (const [trackId, dateNo] of dayTracksToComplete.entries()) {
            const track = await tx.userPlanDayTrack.findUnique({
              where: { id: trackId },
              include: {
                UserTaskScheduler: {
                  where: {
                    status: { in: [TaskStatus.PAUSE, TaskStatus.WAITING] },
                  },
                  include: {
                    task: true,
                  },
                  orderBy: {
                    day_sort: 'asc',
                  },
                },
              },
            });

            if (track && !track.is_complete) {
              // 标记计划日为完成
              await tx.userPlanDayTrack.update({
                where: { id: trackId },
                data: {
                  is_complete: true,
                  completed_at: yesterdayEnd,
                  learning_experience: '当日未手动完成打卡，此为系统自动关闭',
                },
              });

              // 4. 检查这个计划日中是否有PAUSE和WAITING的任务需要顺延
              if (track.UserTaskScheduler && track.UserTaskScheduler.length > 0) {
                const nextDayNo = track.date_no + 1;

                // 确保下一个计划日存在
                let nextDayTrack = await tx.userPlanDayTrack.findFirst({
                  where: {
                    plan_id: planId,
                    date_no: nextDayNo,
                  },
                });

                if (!nextDayTrack) {
                  // 如果下一个计划日不存在，创建一个
                  nextDayTrack = await tx.userPlanDayTrack.create({
                    data: {
                      plan_id: planId,
                      date_no: nextDayNo,
                      total_time: 0,
                      is_complete: false,
                    },
                  });
                }

                // 获取下一个计划日最顶端的day_sort
                const nextDayTopSort = await tx.userTaskScheduler.findFirst({
                  where: {
                    plan_id: planId,
                    date_no: nextDayNo,
                  },
                  orderBy: { day_sort: 'asc' },
                  select: { day_sort: true },
                });
                let targetDaySort = nextDayTopSort ? nextDayTopSort.day_sort - 1 : 1;

                // 如果目标day_sort <= 0，需要调整次日所有任务的day_sort
                if (targetDaySort <= 0) {
                  await tx.userTaskScheduler.updateMany({
                    where: {
                      plan_id: planId,
                      date_no: nextDayNo,
                    },
                    data: {
                      day_sort: { increment: 1 },
                    },
                  });
                  targetDaySort = 1;
                }

                // 顺延所有PAUSE和WAITING的任务到下一个计划日开头
                for (const scheduler of track.UserTaskScheduler) {
                  // 调整当前天其他任务的day_sort（因为移除了这个任务）
                  await tx.userTaskScheduler.updateMany({
                    where: {
                      plan_id: planId,
                      date_no: track.date_no,
                      day_sort: { gt: scheduler.day_sort },
                    },
                    data: {
                      day_sort: { decrement: 1 },
                    },
                  });

                  // 更新任务到下一个计划日
                  await tx.userTaskScheduler.update({
                    where: { task_id: scheduler.task_id },
                    data: {
                      date_no: nextDayNo,
                      day_sort: targetDaySort,
                      track_id: nextDayTrack.id,
                      is_postpone: true, // 标记为被顺延
                    } as any,
                  });

                  targetDaySort += 1; // 下一个任务放在更后面
                }
              }
            }
          }
        });
      }

      this.logger.info(`自动关闭前一天任务完成，处理了 ${tasksByPlan.size} 个计划`);
    } catch (error) {
      this.logger.error(`自动关闭前一天任务失败: ${error.message}`, error.stack);
    }
  }
  

}
