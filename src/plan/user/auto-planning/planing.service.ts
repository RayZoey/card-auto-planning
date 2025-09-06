/*
 * @Author: Reflection lighthouseinmind@yeah.net
 * @Date: 2025-09-06 16:47:19
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-09-06 17:27:31
 * @FilePath: /card-auto-planning/src/plan/user/auto-planning/planing.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import {Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {BaseService} from '@src/base/base.service';
import { AutoPlanMode } from '@prisma/client';
const moment = require('moment');

@Injectable()
export class AutoPlanningService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly baseService: BaseService,
  ) {}
  
  /** 对外：删除任务后补空 */
  async autoPlanAfterDelete(planId: number, deleteTaskId: number, mode: AutoPlanMode) {
    // 下轮给出实现
  }

  /** 对外：插入/新增任务后延后 */
  async autoPlanAfterInsert(planId: number, newTaskId: number | null, targetDate: string, mode: AutoPlanMode) {
    // 下轮给出实现
  }

  /** 对外：平均每日模式 */
  async autoPlanAvgHour(planId: number, totalMin: number, days: number, mode: AutoPlanMode) {
    // 下轮给出实现
  }

}
