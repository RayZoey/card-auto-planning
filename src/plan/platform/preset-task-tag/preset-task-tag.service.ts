/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-12-24 00:03:09
 * @FilePath: /card-backend/src/card/pdf-print-info/pdf-print-info.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';

@Injectable()
export class PresetTaskTagService {
  constructor(
    private readonly prismaService: PrismaService,
  ) {}

  async findAll(offset: number, limit: number) {
    return this.prismaService.presetTaskTag.findMany({
      orderBy: {
        id: 'desc',
      },
      skip: offset,
      take: limit,
    });
  }

  async findTotal(): Promise<number> {
    return this.prismaService.presetTaskTag.count();
  }

}
