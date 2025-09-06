/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-04-14 10:51:15
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-09-06 16:07:32
 * @FilePath: /water/src/main.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {NestFactory} from '@nestjs/core';
import {AppModule} from '@src/app.module';
import * as helmet from 'helmet';
import {ValidationPipe} from '@nestjs/common';
import {NestExpressApplication} from '@nestjs/platform-express';
import {join} from 'path';
import {json} from 'express';
import { DateInterceptor } from './interceptors/date.interceptor';

async function bootstrap() {

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  app.use(helmet());
  app.useStaticAssets(join(__dirname, '../..', 'public'), {
    prefix: '/public/',
  });
  app.useGlobalInterceptors(new DateInterceptor()); /// IOS时间处理转换
  app.use(json({limit: '200mb'}));
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      exceptionFactory: (errors) => {
        return errors;
      },
    })
  );
  await app.startAllMicroservices();
  await app.listen(3001);
}
bootstrap();
