/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-05-22 09:28:57
 * @LastEditors: Ray lighthouseinmind@yeah.net
 * @LastEditTime: 2025-08-15 15:19:41
 * @FilePath: /card-auto-planning/src/timing-scheduler/timing-scheduler.module.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Module} from '@nestjs/common';
import {TimingSchedulerService} from '@src/timing-scheduler/timing-scheduler.service';
import {BaseService} from '@src/base/base.service';
import {UserService} from '@src/wechat/user/user.service';
import {AuthModule} from '@src/auth/auth.module';
const fs = require('fs');

@Module({
  controllers: [],
  providers: [
    TimingSchedulerService,
    BaseService,
    UserService,
  ],
  imports: [
    AuthModule,
  ],
})
export class TimingSchedulerModule {}
