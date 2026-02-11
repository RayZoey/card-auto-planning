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
}
