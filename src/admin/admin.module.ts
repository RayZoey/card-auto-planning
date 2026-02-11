/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-04-14 10:51:15
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-02-11 23:25:54
 * @FilePath: /water/src/wechat/wechat.module.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Module} from '@nestjs/common';
import {BaseService} from '@src/base/base.service';
import {ConfigService} from '@nestjs/config';
import { AdminUserPlanController } from './user/plan/plan.controller';
import { AdminUserPlanService } from './user/plan/plan.service';
import { AdminUserTaskController } from './user/task/task.controller';
import { AdminUserTaskService } from './user/task/task.service';
import { AdminUserTaskGroupController } from './user/task-group/task-group.controller';
import { AdminUserTaskGroupService } from './user/task-group/task-group.service';
const fs = require('fs');

@Module({
  controllers: [
    AdminUserPlanController, AdminUserTaskController, AdminUserTaskGroupController
  ],
  providers: [ BaseService, ConfigService, AdminUserPlanService,
    AdminUserTaskService, AdminUserTaskGroupService
  ],
  imports: [
  ],
})
export class AdminModule {}
