/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-05-22 09:28:57
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-09-06 15:35:03
 * @FilePath: /water/src/timing-scheduler/timing-scheduler.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Inject, Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {Cron, CronExpression} from '@nestjs/schedule';
import {WINSTON_MODULE_PROVIDER} from 'nest-winston';
import {Logger} from 'winston';
import { TaskStatus } from '@prisma/client';
const moment = require('moment');

@Injectable()
export class TimingSchedulerService {
  constructor(
    private readonly prismaService: PrismaService,
    
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}


  // 检测用户异常任务状态 每 60s 扫一次
  @Cron(CronExpression.EVERY_MINUTE)
  async autoPauseStale() {
      const stale = await this.prismaService.userTask.findMany({
        where: {
          status: TaskStatus.PROGRESS,
          last_heartbeat_at: { lt: moment().subtract(90, 's').toDate() }, // 90s 未更新心跳
        },
      });

      for (const t of stale) {
        const min = Math.floor(
          moment(t.last_heartbeat_at).diff(moment(t.segment_start), 'seconds') / 60,
        );
        await this.prismaService.userTask.update({
          where: { id: t.id },
          data: {
            status: TaskStatus.PAUSE,
            actual_time: (t.actual_time || 0) + Math.max(0, min),
          },
        });
      }
    }
}
