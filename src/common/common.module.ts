/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-04-14 10:51:15
 * @LastEditors: Ray lighthouseinmind@yeah.net
 * @LastEditTime: 2025-05-22 09:44:24
 * @FilePath: /water/src/common/common.module.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Module, Global} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {OffsetCalculator} from '@src/common/offset-calculator';
import {QueryConditionParser} from '@src/common/query-condition-parser';

@Global()
@Module({
  providers: [PrismaService, OffsetCalculator, QueryConditionParser],
  controllers: [],
  exports: [PrismaService, OffsetCalculator, QueryConditionParser],
})
export class CommonModule {}
