/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-02-11 23:14:56
 * @FilePath: /card-backend/src/card/pdf-print-info/pdf-print-info.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {BaseService} from '@src/base/base.service';
import {QueryConditionParser} from '@src/common/query-condition-parser';

@Injectable()
export class AdminUserTaskGroupService {
  constructor(
    private readonly prismaService: PrismaService
  ) {}

  async findAll(planId: number) {
    return this.prismaService.userTaskGroup.findMany({
      where: {
        plan_id: planId
      },
    });
  }

  async create(planId: number, userId: number, name: string) {
    return this.prismaService.userTaskGroup.create({
      data: {
        plan: { connect: { id: planId } },
        user: { connect: { id: userId } },
        name: name
      }
    });
  }

  //  编辑用户任务集名称
  async updateTaskGroup(taskGroupId: number, groupName: string, background: string, userId: number) {
    const group = await this.prismaService.userTaskGroup.findFirst({
      where: {
        id: taskGroupId,
        user_id: userId,
      },
    });

    if (!group) {
      throw new HttpException('任务集不存在或不属于当前用户', HttpStatus.BAD_REQUEST);
    }

    return this.prismaService.userTaskGroup.update({
      where: { id: taskGroupId },
      data: {
        name: groupName,
        background: background
      },
    });
  }

  /**
   * 复制平台任务集：按 sourceTaskGroupId 取平台任务集及其下任务，创建新任务集（使用传入 name），并复制所有任务到新任务集下
   */
  async copyFromPlatformTaskGroup(name: string, sourceTaskGroupId: number) {
    const source = await this.prismaService.platformTaskGroup.findUnique({
      where: { id: sourceTaskGroupId },
      include: {
        PlatformTaskGroupAndTaskRelation: {
          include: { platform_task: true },
          orderBy: { group_sort: 'asc' },
        },
      },
    });
    if (!source) {
      throw new HttpException('源任务集不存在', HttpStatus.NOT_FOUND);
    }

    return this.prismaService.$transaction(async (tx) => {
      const newGroup = await tx.platformTaskGroup.create({
        data: {
          name,
          background: source.background,
        },
      });

      for (const rel of source.PlatformTaskGroupAndTaskRelation) {
        const t = rel.platform_task;
        const newTask = await tx.platformTask.create({
          data: {
            name: t.name,
            preset_task_tag_id: t.preset_task_tag_id,
            suggested_time_start: t.suggested_time_start,
            suggested_time_end: t.suggested_time_end,
            remark: t.remark,
            annex_type: t.annex_type,
            annex: t.annex,
            timing_type: t.timing_type,
            occupation_time: t.occupation_time,
          },
        });
        await tx.platformTaskGroupAndTaskRelation.create({
          data: {
            platform_task_group_id: newGroup.id,
            platform_task_id: newTask.id,
            priority: rel.priority,
            group_sort: rel.group_sort,
            can_divisible: rel.can_divisible,
          },
        });
      }

      return tx.platformTaskGroup.findUnique({
        where: { id: newGroup.id },
        include: {
          PlatformTaskGroupAndTaskRelation: {
            include: { platform_task: true },
            orderBy: { group_sort: 'asc' },
          },
        },
      });
    });
  }
}
