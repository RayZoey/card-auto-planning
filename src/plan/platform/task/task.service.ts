/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-02-25 10:30:09
 * @FilePath: /card-backend/src/card/pdf-print-info/pdf-print-info.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {BaseService} from '@src/base/base.service';
import {QueryFilter} from '@src/common/query-filter';
import {QueryConditionParser} from '@src/common/query-condition-parser';
import { PlatformTaskUpdateDto } from './task.update.dto';
import { PlatformTaskCreateDto } from './task.create.dto';
import { PlatformTaskQueryCondition } from './task.query-condition';
const _ = require('lodash');

@Injectable()
export class PlatformTaskService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly baseService: BaseService,
    private readonly queryConditionParser: QueryConditionParser
  ) {}

  async findAll(queryCondition: PlatformTaskQueryCondition, offset: number, limit: number) {
    const filter: QueryFilter = this.queryConditionParser.parse(queryCondition);
    return this.prismaService.platformTask.findMany({
      where: filter,
      skip: offset,
      take: limit,
      include: {
        PlatformTaskGroupAndTaskRelation: {
          select: {
            platform_task_group_id: true,
            priority: true,
            can_divisible: true,
            group_sort: true,
            platform_task_group: {
              select: {
                id: true,
                name: true,
                background: true,
              },
            },
          },
        },
      }
    });  }

  async findTotal(queryCondition: PlatformTaskQueryCondition): Promise<number> {
    const filter: QueryFilter = this.queryConditionParser.parse(queryCondition);
    return this.prismaService.platformTask.count({ where: filter });
  }


  async findById(id: number) {
    return this.prismaService.platformTask.findFirst({
      where: {
        id
      },
      include: {
        PlanTemplateDetail: {
          include: {
            plan_template: {
              select: {
                id: true,
                name: true,
                total_days: true,
                total_time: true,
                remark: true,
                is_enable: true,
              },
            },
          },
        },
        PlatformTaskGroupAndTaskRelation: {
          include: {
            platform_task_group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        preset_task_tag: {
          select: {
            id: true,
            tag_name: true,
          },
        },
      }
    });
  }

  async create(dto: PlatformTaskCreateDto) {
    return await this.prismaService.$transaction(async (prisma) => {
      // 1. 准备任务基础数据
      const taskData: any = {
        name: dto.name,
        suggested_time_start: dto.suggestedTimeSstart,
        suggested_time_end: dto.suggestedTimeEnd,
        remark: dto.remark,
        annex_type: dto.annexType,
        annex: dto.annex,
        timing_type: dto.timingType,
        occupation_time: dto.occupation_time,
        preset_task_tag_id: dto.presetTaskTagId,
      };

      // 2. 创建任务
      const task = await prisma.platformTask.create({
        data: taskData,
      });

      // 3. 如果指定了任务集，创建任务集关联关系
      if (dto.platformTaskGroupId != null) {
        // 3.1 验证任务集是否存在
        const taskGroup = await prisma.platformTaskGroup.findUnique({
          where: { id: dto.platformTaskGroupId },
        });

        if (!taskGroup) {
          throw new Error('指定的任务集不存在');
        }

        // 3.2 确定 group_sort：使用前端传递的值，如果未指定则自动计算
        let newGroupSort: number;
        if (dto.groupSort != null) {
          newGroupSort = dto.groupSort;
          
          // 如果指定了 group_sort，需要调整后续任务的 group_sort
          await prisma.platformTaskGroupAndTaskRelation.updateMany({
            where: {
              platform_task_group_id: dto.platformTaskGroupId,
              group_sort: { gte: newGroupSort },
            },
            data: {
              group_sort: { increment: 1 },
            },
          });
        } else {
          // 如果未指定，自动计算（最大 group_sort + 1）
          const maxGroupSort = await prisma.platformTaskGroupAndTaskRelation.findFirst({
            where: {
              platform_task_group_id: dto.platformTaskGroupId,
            },
            orderBy: {
              group_sort: 'desc',
            },
            select: {
              group_sort: true,
            },
          });
          newGroupSort = (maxGroupSort?.group_sort ?? -1) + 1;
        }

        // 3.3 创建任务集关联关系
        await prisma.platformTaskGroupAndTaskRelation.create({
          data: {
            platform_task_group_id: dto.platformTaskGroupId,
            platform_task_id: task.id,
            priority: dto.priority ?? 9999,
            group_sort: newGroupSort,
            can_divisible: dto.canDivisible ?? true,
          },
        });
      }

      return task;
    });
  }

  async update(id: number, dto: PlatformTaskUpdateDto) {
    const task = await this.prismaService.platformTask.findFirst({
      where: {
        id
      },
      include: {
        PlatformTaskGroupAndTaskRelation: true,
      }
    });
    if (!task){
      throw new Error('未找到该平台任务信息');
    }

    return await this.prismaService.$transaction(async (prisma) => {
      // 1. 准备更新数据（排除关系表字段）
      const updateData: any = {};
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.suggestedTimeSstart !== undefined) updateData.suggested_time_start = dto.suggestedTimeSstart;
      if (dto.suggestedTimeEnd !== undefined) updateData.suggested_time_end = dto.suggestedTimeEnd;
      if (dto.remark !== undefined) updateData.remark = dto.remark;
      if (dto.annexType !== undefined) updateData.annex_type = dto.annexType;
      if (dto.annex !== undefined) updateData.annex = dto.annex;
      if (dto.timingType !== undefined) updateData.timing_type = dto.timingType;
      if (dto.occupationTime !== undefined) updateData.occupation_time = dto.occupationTime;
      if (dto.presetTaskTagId !== undefined) updateData.preset_task_tag_id = dto.presetTaskTagId;

      // 2. 更新任务基础信息（只有当有数据需要更新时才执行）
      if (Object.keys(updateData).length > 0) {
        await prisma.platformTask.update({
          data: updateData,
          where: {
            id: id,
          },
        });
      }

      // 3. 如果 priority 或 canDivisible 变更，更新关系信息
      if ((dto.priority !== undefined || dto.canDivisible !== undefined) && task.PlatformTaskGroupAndTaskRelation.length > 0) {
        const relationUpdateData: any = {};
        if (dto.priority !== undefined) relationUpdateData.priority = dto.priority;
        if (dto.canDivisible !== undefined) relationUpdateData.can_divisible = dto.canDivisible;

        // 更新所有相关的任务集关系
        await prisma.platformTaskGroupAndTaskRelation.updateMany({
          where: {
            platform_task_id: id,
          },
          data: relationUpdateData,
        });
      }

      // 4. 如果 occupation_time 变更，更新所有使用该任务的计划模板的 limit_hour 和 total_time
      if (dto.occupationTime !== undefined && dto.occupationTime !== task.occupation_time) {
        await this.updatePlanTemplatesForTask(prisma, id);
      }

      return true;
    });
  }

  /**
   * 更新任务在任务集中的顺序（group_sort）
   * 只能用于任务集任务，会更新所有使用该任务的计划模板中的 group_sort
   */
  async updateGroupSort(id: number, newGroupSort: number) {
    // 1. 检查任务是否存在，并检查是否是任务集任务
    const task = await this.prismaService.platformTask.findFirst({
      where: {
        id
      },
      include: {
        PlatformTaskGroupAndTaskRelation: {
          take: 1,
        },
        PlanTemplateDetail: {
          where: {
            platform_task_group_id: { not: null },
            group_sort: { not: null },
          },
          select: {
            id: true,
            plan_template_id: true,
            platform_task_group_id: true,
            group_sort: true,
          },
        },
      }
    });

    if (!task) {
      throw new Error('未找到该平台任务信息');
    }

    // 2. 校验该任务是否是任务集任务
    if (task.PlatformTaskGroupAndTaskRelation.length === 0 && task.PlanTemplateDetail.length === 0) {
      throw new Error('该任务不是任务集任务，无法更新任务集顺序');
    }

    const relation = task.PlatformTaskGroupAndTaskRelation[0] ?? null;

    return await this.prismaService.$transaction(async (prisma) => {
      let groupId: number | null = null;

      // 3. 先以「平台任务集与任务关系」为唯一真源，调整该任务在任务集中的 group_sort
      if (relation) {
        groupId = relation.platform_task_group_id as number;
        const oldGroupSort = relation.group_sort as number | null;

        if (oldGroupSort != null && newGroupSort !== oldGroupSort) {
          if (newGroupSort > oldGroupSort) {
            // 将 (old, new] 区间内的任务整体后移一位
            await prisma.platformTaskGroupAndTaskRelation.updateMany({
              where: {
                platform_task_group_id: groupId,
                group_sort: {
                  gt: oldGroupSort,
                  lte: newGroupSort,
                },
              },
              data: {
                group_sort: { decrement: 1 },
              },
            });
          } else if (newGroupSort < oldGroupSort) {
            // 将 [new, old) 区间内的任务整体前移一位
            await prisma.platformTaskGroupAndTaskRelation.updateMany({
              where: {
                platform_task_group_id: groupId,
                group_sort: {
                  gte: newGroupSort,
                  lt: oldGroupSort,
                },
              },
              data: {
                group_sort: { increment: 1 },
              },
            });
          }

          // 更新当前任务在任务集关系表中的 group_sort
          await prisma.platformTaskGroupAndTaskRelation.update({
            where: {
              platform_task_group_id_platform_task_id: {
                platform_task_group_id: groupId,
                platform_task_id: id,
              },
            },
            data: {
              group_sort: newGroupSort,
            },
          });
        }
      }

      // 4. 再把所有使用该任务集的模版里的 group_sort 同步为「任务集关系表」中的顺序
      // if (groupId != null) {
      //   const groupRelations = await prisma.platformTaskGroupAndTaskRelation.findMany({
      //     where: {
      //       platform_task_group_id: groupId,
      //     },
      //     select: {
      //       platform_task_id: true,
      //       group_sort: true,
      //     },
      //   });

      //   if (groupRelations.length > 0) {
      //     for (const rel of groupRelations) {
      //       await prisma.planTemplateDetail.updateMany({
      //         where: {
      //           platform_task_group_id: groupId,
      //           platform_task_id: rel.platform_task_id,
      //         },
      //         data: {
      //           group_sort: rel.group_sort,
      //         },
      //       });
      //     }
      //   }
      // } else {
      //   // 防御性兜底：没有关系记录时，退回原来的「只改模版」逻辑
      //   for (const detail of task.PlanTemplateDetail) {
      //     const oldGroupSort = detail.group_sort;
      //     if (oldGroupSort === null) continue;

      //     if (newGroupSort > oldGroupSort) {
      //       await prisma.planTemplateDetail.updateMany({
      //         where: {
      //           plan_template_id: detail.plan_template_id,
      //           platform_task_group_id: detail.platform_task_group_id,
      //           group_sort: {
      //             gt: oldGroupSort,
      //             lte: newGroupSort,
      //           },
      //         },
      //         data: {
      //           group_sort: { decrement: 1 },
      //         },
      //       });
      //     } else if (newGroupSort < oldGroupSort) {
      //       await prisma.planTemplateDetail.updateMany({
      //         where: {
      //           plan_template_id: detail.plan_template_id,
      //           platform_task_group_id: detail.platform_task_group_id,
      //           group_sort: {
      //             gte: newGroupSort,
      //             lt: oldGroupSort,
      //           },
      //         },
      //         data: {
      //           group_sort: { increment: 1 },
      //         },
      //       });
      //     }

      //     await prisma.planTemplateDetail.update({
      //       where: {
      //         id: detail.id,
      //       },
      //       data: {
      //         group_sort: newGroupSort,
      //       },
      //     });
      //   }
      // }

      return true;
    });
  }

  /**
   * 更新所有使用该任务的计划模板的 limit_hour 和 total_time
   */
  private async updatePlanTemplatesForTask(prisma: any, taskId: number) {
    // 查找所有使用该任务的计划模板详情
    const templateDetails = await prisma.planTemplateDetail.findMany({
      where: {
        platform_task_id: taskId,
      },
      select: {
        plan_template_id: true,
        date_no: true,
      },
    });

    if (templateDetails.length === 0) {
      return;
    }

    // 按计划模板分组
    const templateIds = [...new Set(templateDetails.map(d => d.plan_template_id))];

    // 对每个计划模板重新计算 limit_hour 和 total_time
    for (const templateId of templateIds) {
      const allDetails = await prisma.planTemplateDetail.findMany({
        where: {
          plan_template_id: templateId,
        },
        select: {
          id: true,
          date_no: true,
          platform_task: {
            select: {
              occupation_time: true,
            },
          },
        },
      });

      // 按 date_no 分组并计算每天的总耗时
      const taskListGroupByDateNo = _.groupBy(allDetails, 'date_no');
      const limitHour: Record<string, number> = {};
      
      // 只包含有任务的日期，过滤掉空任务或 occupation_time 为 null 的情况
      for (const [dateNo, details] of Object.entries(taskListGroupByDateNo)) {
        const detailsArray = details as typeof allDetails;
        const totalTime = detailsArray
          .filter(d => d.platform_task && d.platform_task.occupation_time != null)
          .reduce((sum, d) => sum + (d.platform_task.occupation_time || 0), 0);
        if (totalTime > 0) {
          limitHour[dateNo] = totalTime;
        }
      }

      // 计算总时长
      const totalTime = _.sum(_.values(limitHour));

      // 计算总天数（limit_hour 中最大的日期号）
      const totalDays = Object.keys(limitHour).length > 0 
        ? Math.max(...Object.keys(limitHour).map(k => parseInt(k, 10)))
        : 0;

      // 更新计划模板
      await prisma.planTemplate.update({
        where: {
          id: templateId,
        },
        data: {
          limit_hour: limitHour,
          total_time: totalTime,
          total_days: totalDays,
        },
      });
    }
  }

  async delete(id: number) {
    const task = await this.prismaService.platformTask.findFirst({
      where: {
        id
      },
      include: {
        PlanTemplateDetail: {
          select: {
            id: true,
            plan_template_id: true,
            date_no: true,
            day_sort: true,
            group_sort: true,
            global_sort: true,
            platform_task_group_id: true,
          },
        },
      }
    });
    if (!task){
      throw new Error('未找到该平台任务信息');
    }

    return await this.prismaService.$transaction(async (prisma) => {
      // 1. 获取所有使用该任务的计划模板ID和详情（在删除前获取）
      const templateIds = [...new Set(task.PlanTemplateDetail.map(d => d.plan_template_id))];
      const deletedDetails = task.PlanTemplateDetail;

      // 2. 调整后续任务的顺序字段
      for (const deletedDetail of deletedDetails) {
        const { plan_template_id, date_no, day_sort, group_sort, global_sort, platform_task_group_id } = deletedDetail;

        // 2.1 调整同一天（date_no）的后续任务的 day_sort
        await prisma.planTemplateDetail.updateMany({
          where: {
            plan_template_id: plan_template_id,
            date_no: date_no,
            day_sort: { gt: day_sort },
          },
          data: {
            day_sort: { decrement: 1 },
          },
        });

        // 2.2 如果该任务属于任务集，调整同一任务集的后续任务的 group_sort
        if (platform_task_group_id != null && group_sort != null) {
          await prisma.planTemplateDetail.updateMany({
            where: {
              plan_template_id: plan_template_id,
              platform_task_group_id: platform_task_group_id,
              group_sort: { gt: group_sort },
            },
            data: {
              group_sort: { decrement: 1 },
            },
          });
        }

        // 2.3 调整同一模板的后续任务的 global_sort
        await prisma.planTemplateDetail.updateMany({
          where: {
            plan_template_id: plan_template_id,
            global_sort: { gt: global_sort },
          },
          data: {
            global_sort: { decrement: 1 },
          },
        });
      }

      // 3. 删除任务集关系
      await prisma.platformTaskGroupAndTaskRelation.deleteMany({
        where: {
          platform_task_id: id,
        },
      });

      // 4. 删除计划模板详情（如果有关联）
      await prisma.planTemplateDetail.deleteMany({
        where: {
          platform_task_id: id,
        },
      });

      // 5. 删除任务本身
      await prisma.platformTask.delete({
        where: {
          id: id,
        },
      });

      // 6. 更新所有相关计划模板的 limit_hour 和 total_time
      for (const templateId of templateIds) {
        const allDetails = await prisma.planTemplateDetail.findMany({
          where: {
            plan_template_id: templateId,
          },
          select: {
            id: true,
            date_no: true,
            platform_task: {
              select: {
                occupation_time: true,
              },
            },
          },
        });

        // 如果该模板还有其他任务，重新计算 limit_hour 和 total_time
        if (allDetails.length > 0) {
          const taskListGroupByDateNo = _.groupBy(allDetails, 'date_no');
          const limitHour: Record<string, number> = {};
          
          // 只包含有任务的日期，过滤掉空任务或 occupation_time 为 null 的情况
          for (const [dateNo, details] of Object.entries(taskListGroupByDateNo)) {
            const detailsArray = details as typeof allDetails;
            const totalTime = detailsArray
              .filter(d => d.platform_task && d.platform_task.occupation_time != null)
              .reduce((sum, d) => sum + (d.platform_task.occupation_time || 0), 0);
            if (totalTime > 0) {
              limitHour[dateNo] = totalTime;
            }
          }
          
          const totalTime = _.sum(_.values(limitHour));
          
          // 计算总天数（limit_hour 中最大的日期号）
          const totalDays = Object.keys(limitHour).length > 0 
            ? Math.max(...Object.keys(limitHour).map(k => parseInt(k, 10)))
            : 0;

          await prisma.planTemplate.update({
            where: {
              id: templateId,
            },
            data: {
              limit_hour: limitHour,
              total_time: totalTime,
              total_days: totalDays,
            },
          });
        } else {
          // 如果模板没有任务了，清空 limit_hour 和 total_time，total_days 设为 0
          await prisma.planTemplate.update({
            where: {
              id: templateId,
            },
            data: {
              limit_hour: {},
              total_time: 0,
              total_days: 0,
            },
          });
        }
      }

      return true;
    });
  }

}
