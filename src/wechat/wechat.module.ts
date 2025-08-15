/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-04-14 10:51:15
 * @LastEditors: Ray lighthouseinmind@yeah.net
 * @LastEditTime: 2025-05-22 16:29:37
 * @FilePath: /water/src/wechat/wechat.module.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Module} from '@nestjs/common';
import {UserController} from '@src/wechat/user/user.controller';
import {UserService} from '@src/wechat/user/user.service';
import {BaseService} from '@src/base/base.service';
import {ConfigService} from '@nestjs/config';
const fs = require('fs');

@Module({
  controllers: [UserController],
  providers: [UserService, BaseService, ConfigService],
  imports: [
  ],
})
export class WechatModule {}
