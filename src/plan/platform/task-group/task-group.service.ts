/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Ray lighthouseinmind@yeah.net
 * @LastEditTime: 2025-08-18 15:53:23
 * @FilePath: /card-backend/src/card/pdf-print-info/pdf-print-info.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {BaseService} from '@src/base/base.service';
import {QueryFilter} from '@src/common/query-filter';
import {QueryConditionParser} from '@src/common/query-condition-parser';

@Injectable()
export class PlatfromTaskGroupService {
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

  async create(name: string) {
    return this.prismaService.platformTaskGroup.create({
      data: {
        name: name
      }
    });
  }

  async update(id: number, name: string) {
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
        name: name
      },
      where: {
        id: id,
      },
    });
  }

  async delete(id: number) {
  }
}
