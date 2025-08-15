/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-05-22 09:28:57
 * @LastEditors: Ray lighthouseinmind@yeah.net
 * @LastEditTime: 2025-08-15 15:19:38
 * @FilePath: /water/src/timing-scheduler/timing-scheduler.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Inject, Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {Cron, CronExpression} from '@nestjs/schedule';
import {WINSTON_MODULE_PROVIDER} from 'nest-winston';
import {Logger} from 'winston';

@Injectable()
export class TimingSchedulerService {
  constructor(
    private readonly prismaService: PrismaService,
    
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

}
