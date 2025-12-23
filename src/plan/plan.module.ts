/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-04-14 10:51:15
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-12-24 00:47:08
 * @FilePath: /water/src/wechat/wechat.module.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Module} from '@nestjs/common';
import {BaseService} from '@src/base/base.service';
import {ConfigService} from '@nestjs/config';
import { PlatformPlanTemplateController } from './platform/plan-template/plan-template.controller';
import { PlatformPlanTemplateService } from './platform/plan-template/plan-template.service';
import { PlatformTaskGroupController } from './platform/task-group/task-group.controller';
import { PlatformTaskController } from './platform/task/task.controller';
import { UserPlanController } from './user/plan/plan.controller';
import { UserPlanService } from './user/plan/plan.service';
import { PlatformTaskGroupService } from './platform/task-group/task-group.service';
import { PlatformTaskService } from './platform/task/task.service';
import { UserTaskController } from './user/task/task.controller';
import { UserTaskService } from './user/task/task.service';
import { AutoPlanningService } from './user/auto-planning/planning.service';
import { PresetTaskTagController } from './platform/preset-task-tag/preset-task-tag.controller';
import { PresetTaskTagService } from './platform/preset-task-tag/preset-task-tag.service';
import { UserTaskGroupController } from './user/task-group/task-group.controller';
import { UserTaskGroupService } from './user/task-group/task-group.service';
const fs = require('fs');

@Module({
  controllers: [PlatformPlanTemplateController, PlatformTaskGroupController, PlatformTaskController,
    UserPlanController, UserTaskController, PresetTaskTagController, UserTaskGroupController
  ],
  providers: [PlatformPlanTemplateService, PlatformTaskGroupService, PlatformTaskService, BaseService, ConfigService, UserPlanService,
    UserTaskService, AutoPlanningService, PresetTaskTagService, UserTaskGroupService
  ],
  imports: [
  ],
})
export class PlanModule {}
