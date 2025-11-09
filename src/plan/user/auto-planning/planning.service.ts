/*
 * @Author: Reflection lighthouseinmind@yeah.net
 * @Date: 2025-09-06 16:47:19
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-11-09 15:04:21
 * @FilePath: /card-auto-planning/src/plan/user/auto-planning/planing.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import {Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {BaseService} from '@src/base/base.service';
const moment = require('moment');

@Injectable()
export class AutoPlanningService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly baseService: BaseService,
  ) {}
  
}
