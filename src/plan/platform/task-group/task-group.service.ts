/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-02-06 12:08:36
 * @FilePath: /card-backend/src/card/pdf-print-info/pdf-print-info.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {BaseService} from '@src/base/base.service';
import {QueryFilter} from '@src/common/query-filter';
import {QueryConditionParser} from '@src/common/query-condition-parser';

@Injectable()
export class PlatformTaskGroupService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly baseService: BaseService,
    private readonly queryConditionParser: QueryConditionParser
  ) {}

  async findAll(offset: number, limit: number) {
    return this.prismaService.platformTaskGroup.findMany({
      orderBy: {
        id: 'desc',
      },
      skip: offset,
      take: limit,
    });
  }

  async findTotal(): Promise<number> {
    return this.prismaService.platformTaskGroup.count();
  }

  async findById(id: number) {
    return this.prismaService.platformTaskGroup.findFirst({
      where: {
        id: id
      },
      include: {
        PlatformTaskGroupAndTaskRelation: {
          include: {
            platform_task: true
          }
        }
      }
    });
  }

  async create(name: string, background: string) {
    return this.prismaService.platformTaskGroup.create({
      data: {
        name: name,
        background: background
      }
    });
  }

  async update(id: number, name: string, background: string) {
    const template = await this.prismaService.platformTaskGroup.findFirst({
      where: {
        id
      }
    });
    if (!template){
      throw new Error('未找到该平台任务集信息');
    }
    return this.prismaService.platformTaskGroup.update({
      data: {
        name: name,
        background: background
      },
      where: {
        id: id,
      },
    });
  }

  async delete(id: number) {
    // 1. 检查任务集是否存在
    const group = await this.prismaService.platformTaskGroup.findUnique({
      where: { id },
      include: {
        PlatformTaskGroupAndTaskRelation: {
          select: {
            platform_task_id: true,
          },
        },
      },
    });

    if (!group) {
      throw new HttpException('平台任务集不存在', HttpStatus.NOT_FOUND);
    }

    // 2. 检查是否被平台模版引用（PlanTemplateDetail 中是否存在该任务集）
    const usedCount = await this.prismaService.planTemplateDetail.count({
      where: {
        platform_task_group_id: id,
      },
    });

    if (usedCount > 0) {
      throw new HttpException('该平台任务集已被计划模版引用，无法删除', HttpStatus.BAD_REQUEST);
    }

    // 3. 未被引用：删除任务集及其下任务和关联关系
    await this.prismaService.$transaction(async (tx) => {
      const taskIds = group.PlatformTaskGroupAndTaskRelation.map((r) => r.platform_task_id);

      if (taskIds.length > 0) {
        // 3.1 删除该任务集与任务的关系
        await tx.platformTaskGroupAndTaskRelation.deleteMany({
          where: {
            platform_task_group_id: id,
          },
        });

        // 3.2 删除这些平台任务本身
        await tx.platformTask.deleteMany({
          where: {
            id: { in: taskIds },
          },
        });
      }

      // 3.3 删除任务集
      await tx.platformTaskGroup.delete({
        where: { id },
      });
    });

    return true;
  }

  //  关联任务集与任务
  async connectTask(groupId: number, taskArr: []){
    const group = await this.prismaService.platformTaskGroup.findFirst({
      where: {
        id: groupId
      }
    });
    if (!group){
      throw new Error('该任务集不存在');
    }
    //  清空关联关系
    await this.prismaService.platformTaskGroupAndTaskRelation.deleteMany({
      where: {
        platform_task_group_id: groupId
      }
    });
    //  建立关联关系
    return await this.prismaService.platformTaskGroupAndTaskRelation.createMany({
      data: taskArr.map(taskId => ({
        platform_task_group_id: groupId,
        platform_task_id: taskId,
      })),
      skipDuplicates: true,
    });
  }
}
