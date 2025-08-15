/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-05-06 09:11:01
 * @LastEditors: Ray lighthouseinmind@yeah.net
 * @LastEditTime: 2025-08-15 15:24:11
 * @FilePath: /water/src/app.module.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {MiddlewareConsumer, Module} from '@nestjs/common';
import {AllExceptionFilter} from '@src/common/all-exception.filter';
import {APP_FILTER} from '@nestjs/core';
import {ConfigModule} from '@nestjs/config';
import {CommonModule} from '@src/common/common.module';
import {ScheduleModule} from '@nestjs/schedule';
import {BaseModule} from './base/base.module';
import {WechatModule} from '@src/wechat/wechat.module';
import {AuthModule} from '@src/auth/auth.module';
import {WinstonModule} from "nest-winston";
import * as winston from "winston";
import {utilities as nestWinstonModuleUtilities} from "nest-winston/dist/winston.utilities";
import * as path from 'path';
import { TimingSchedulerModule } from './timing-scheduler/timing-scheduler.module';
import { DeepTimezoneMiddleware } from './common/timezone.middleware';

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({isGlobal: true}),
    ScheduleModule.forRoot(),
    BaseModule,
    AuthModule,
    WechatModule, //  微信
    TimingSchedulerModule,
    WinstonModule.forRoot({
    level: 'info', // 设置日志级别
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({stack: true}), // 显示堆栈信息
      winston.format.splat(),
      winston.format.prettyPrint(),
      nestWinstonModuleUtilities.format.nestLike('Card', {
        prettyPrint: true,
        processId: true,
        appName: true,
      }) // 使用 JSON 格式
    ),
    transports: [
      new winston.transports.File({filename: path.join(process.env.LOG_DIR || path.join(__dirname, '..', 'logs'), 'error.log'), level: 'error'}),
      new winston.transports.File({filename: path.join(process.env.LOG_DIR || path.join(__dirname, '..', 'logs'), 'combined.log')}),
    ],
    // 在开发环境中，将日志输出到控制台
    ...(process.env.NODE_ENV !== 'production' && {
      transports: [
        new winston.transports.Console({}),
      ],
    }),
  })
  ],
  providers: [
    // {
    //   provide: APP_FILTER,
    //   useClass: AllExceptionFilter,
    // },
  ],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(DeepTimezoneMiddleware)
      .forRoutes('*');
  }
}
