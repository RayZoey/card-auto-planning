/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-11-29 11:49:02
 * @FilePath: /card-auto-planning/src/plan/platform/plan-template/plan-template.controller.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, Query, Req, Res, UseGuards} from '@nestjs/common';
import {OffsetCalculator} from '@src/common/offset-calculator';
import {JwtAuthGuard} from '@src/auth/jwt-auth.guard';
import {PaginationDto} from '@src/common/pagination.dto';
import {CollectionResource} from '@src/common/collection-resource';
import {Response} from 'express';
import { RoleGuard } from '@src/auth/role.guard';
import { UserTaskService } from './task.service';
import { UserTaskQueryCondition } from './task.query-condition';
import { UserTaskQuery } from './task.query';
import { UserTaskCreateDto } from './task.create.dto';
import { UserTaskUpdateDto } from './task.update.dto';
import { MarkDayCompleteDto, AdvanceNextDayTasksDto, ProcessDayTasksDto } from './task.day-complete.dto';
import { TaskStatus } from '@prisma/client';

@Controller('user-task')
export class UserTaskController {
  constructor(private readonly service: UserTaskService, private offsetCalculator: OffsetCalculator) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async findById(@Req() req, @Param('id') id: number) {
    const res = await this.service.findById(id);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    };  
  }
  
//   {
//     "name": "零散任务",
//     "plan_id": 52,
//     "background": "#DAA520",
//     "remark": "备注",
//     "timing_type": "POMODORO",
//     "occupation_time": 60,
//     "need_auto_plan": true,
//     "need_auto_fill": true,
//     "UserTaskScheduler": {
//         "priority": 9999,
//         "global_sort": 2,
//         "day_sort": 2,
//         "can_divisible": true,
//         "date_no": 1
//     }
// }
  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async create(@Req() req, @Body() createDto: UserTaskCreateDto, @Body('need_auto_plan') needAutoPlan: boolean, @Body('need_auto_fill') needAutoFill: boolean) {
    const userId = req.user.accountId;
    const res = await this.service.create(userId, createDto, needAutoPlan, needAutoFill);
    return {                                     
      code: HttpStatus.CREATED,
      data: res,
      res: '成功',
    }; 
  }

  //  心跳接口
  @Put('heartbeat/:id')
  async heartbeat(@Req() req, @Param('id') id: number) {
    const userId = req.user.accountId;
    const res = await this.service.heartbeat(id, userId);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }

  // 学习状态反馈
  @Put('/change-status/:id')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async changeTaskStatus(@Req() req, @Param('id') id: number, @Body('status') status: TaskStatus) {
    const userId = req.user.accountId;
    const res = await this.service.changeTaskStatus(id, status, userId);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async update(@Req() req, @Param('id') id: number, @Body() updateDto: UserTaskUpdateDto) {
    const userId = req.user.accountId;
    const res = await this.service.update(id, updateDto, userId);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async delete(@Req() req, @Param('id') id: number, @Body('need_auto_plan') needAutoPlan: boolean, @Body('need_auto_fill') needAutoFill: boolean) {
    const userId = req.user.accountId;
    const res = await this.service.delete(userId, id, needAutoPlan, needAutoFill);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }

  //  标记今日所有任务已完成（完成打卡）
  @Post('mark-day-complete')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async markDayComplete(@Req() req, @Body() dto: MarkDayCompleteDto) {
    const userId = req.user.accountId;
    const res = await this.service.markDayComplete(userId, dto.plan_id, dto.date_no);
    return {
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    };
  }

  //  提前次日任务到今日
  @Post('advance-next-day-tasks')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async advanceNextDayTasks(@Req() req, @Body() dto: AdvanceNextDayTasksDto) {
    const userId = req.user.accountId;
    const res = await this.service.advanceNextDayTasks(
      userId,
      dto.plan_id,
      dto.date_no,
      dto.next_day_task_ids,
      dto.need_auto_fill
    );
    return {
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    };
  }

  // {
  //   "plan_id": 1,
  //   "date_no": 1,
  //   "tasks": [
  //     {
  //       "task_id": 10,
  //       "action": "skip"
  //     },
  //     {
  //       "task_id": 11,
  //       "action": "postpone",
  //       "need_auto_fill": false
  //     },
  //     {
  //       "task_id": 12,
  //       "action": "postpone",
  //       "need_auto_fill": true
  //     }
  //   ]
  // }
  //  处理当日未完成任务（跳过或延期）
  @Post('process-day-tasks')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async processDayTasks(@Req() req, @Body() dto: ProcessDayTasksDto) {
    const userId = req.user.accountId;
    const res = await this.service.processDayTasks(
      userId,
      dto.plan_id,
      dto.date_no,
      dto.tasks
    );
    return {
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    };
  }

  //  获取计划的每日进度信息
  @Get('plan-day-progress/:planId')
  @UseGuards(JwtAuthGuard, RoleGuard('miniUser'))
  async getPlanDayProgress(@Req() req, @Param('planId') planId: number) {
    const userId = req.user.accountId;
    const res = await this.service.getPlanDayProgress(userId, planId);
    return {
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    };
  }
}
