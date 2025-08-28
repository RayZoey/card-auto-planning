/*
 * @Author: Reflection lighthouseinmind@yeah.net
 * @Date: 2025-08-25 21:59:11
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-08-29 00:33:05
 * @FilePath: /card-auto-planning/src/teacher/teacher.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {ConfigService} from '@nestjs/config';
import { QueryConditionParser } from '@src/common/query-condition-parser';
import { TeacherQueryCondition } from './teacher.query-condition';
import { QueryFilter } from '@src/common/query-filter';

@Injectable()
export class TeacherService {
  constructor(private readonly prismaService: PrismaService, readonly configService: ConfigService, 
      private readonly queryConditionParser: QueryConditionParser) {}

  async findAll(queryCondition: TeacherQueryCondition,offset: number, limit: number) {
    const filter: QueryFilter = this.queryConditionParser.parse(queryCondition);
    console.log(filter)
    return await this.prismaService.teacher.findMany({
      orderBy: {
        order: 'asc',
      },
      where: filter,
      skip: offset,
      take: limit,
    });
  }

  async findTotal(queryCondition: TeacherQueryCondition): Promise<number> {
    const filter: QueryFilter = this.queryConditionParser.parse(queryCondition);
    return this.prismaService.teacher.count(
        {
          where: filter,
        }
    );
  }
}
