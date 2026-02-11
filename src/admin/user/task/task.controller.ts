/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-07-08 14:59:59
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-02-12 00:09:48
 * @FilePath: /card-auto-planning/src/plan/platform/plan-template/plan-template.controller.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, Query, Req, Res, UseGuards} from '@nestjs/common';
import {OffsetCalculator} from '@src/common/offset-calculator';
import {JwtAuthGuard} from '@src/auth/jwt-auth.guard';
import { RoleGuard } from '@src/auth/role.guard';
import { AdminUserTaskService } from './task.service';
import { AdminMarkDayCompleteDto, AdminAdvanceNextDayTasksDto, AdminProcessDayTasksDto } from './task.day-complete.dto';
import { AdminUserTaskSplitDto } from './task.split.dto';
import { AdminChangeTaskStatusDto } from './task.change-status.dto';
import { AdminUserTaskBaseUpdateDto } from './task.base-update.dto';
import { AdminUserTaskCreateDto } from './task.create.dto';

@Controller('admin/user-task')
export class AdminUserTaskController {
  constructor(private readonly service: AdminUserTaskService, private offsetCalculator: OffsetCalculator) {}

  // //  心跳接口
  // @Put('heartbeat/:id')
  // @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  // async heartbeat(@Req() req, @Param('id') id: number) {
  //   const userId = req.user.accountId;
  //   const res = await this.service.heartbeat(id, userId);
  //   return {                                     
  //     code: HttpStatus.OK,
  //     data: res,
  //     res: '成功',
  //   }; 
  // }

  // // 学习状态反馈
  // @Put('/change-status/:id')
  // @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  // async changeTaskStatus(@Req() req, @Param('id') id: number, @Body() dto: AdminChangeTaskStatusDto) {
  //   const userId = req.user.accountId;
  //   const res = await this.service.changeTaskStatus(id, dto.status, userId, {
  //     needContinuation: dto.need_continuation,
  //     continuationPercentage: dto.continuation_percentage,
  //   });
  //   return {
  //     code: HttpStatus.OK,
  //     data: res,
  //     res: '成功',
  //   };
  // }

  //  编辑用户任务基础信息
  @Put('base-info/:id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async updateBaseInfo(@Req() req, @Param('id') id: number,  @Body('mini_user_id') userId: number, @Body() dto: AdminUserTaskBaseUpdateDto) {
    const res = await this.service.updateBaseInfo(Number(id), dto, userId);
    return {
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    };
  }


  //  分割任务-用户拆分任务为两段
  @Post('split/:id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async splitTask(@Req() req, @Param('id') id: number,  @Body('mini_user_id') userId: number, @Body() dto: AdminUserTaskSplitDto) {
    const res = await this.service.splitTask(
      userId,
      Number(id),
      {
        name: dto.first_name,
        minutes: dto.first_minutes,
      },
      {
        name: dto.second_name,
        minutes: dto.second_minutes,
      },
    );
    return {
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    };
  }

  // //  学习总览（主页统计）
  // @Get('overview/:planId')
  // @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  // async overview(@Req() req, @Param('planId') planId: number, @Query('start_date') startDate: Date, @Query('end_date') endDate: Date) {
  //   const userId = req.user.accountId;
  //   const res = await this.service.overview(userId, planId, startDate, endDate);
  //   return {
  //     code: HttpStatus.OK,
  //     data: res,
  //     res: '成功',
  //   };
  // }


  // //  获取今日学习统计（打卡页面）
  // @Get('today-learning-statistics/:planId')
  // @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  // async getTodayLearningStatistics(@Req() req, @Param('planId') planId: number, @Query('date_no') dateNo: number) {
  //   const userId = req.user.accountId;
  //   const res = await this.service.getTodayLearningStatistics(userId, planId, dateNo);
  //   return {
  //     code: HttpStatus.OK,
  //     data: res,
  //     res: '成功',
  //   };
  // }

  // //  标记今日所有任务已完成（完成打卡）
  // @Post('mark-day-complete')
  // @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  // async markDayComplete(@Req() req, @Body() dto: AdminMarkDayCompleteDto, @Body('learning_experience') learningExperience: string | null, @Body('annex') annex: any) {
  //   const userId = req.user.accountId;
  //   const res = await this.service.markDayComplete(userId, dto.plan_id, dto.date_no, learningExperience, annex, dto.score);
  //   return {
  //     code: HttpStatus.OK,
  //     data: res,
  //     res: '成功',
  //   };
  // }

  //  提前次日任务到今日
  @Post('advance-next-day-tasks')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async advanceNextDayTasks(@Req() req,  @Body('mini_user_id') userId: number, @Body() dto: AdminAdvanceNextDayTasksDto) {
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

  //  处理当日未完成任务（跳过或延期）
  @Post('process-day-tasks')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async processDayTasks(@Req() req, @Body('mini_user_id') userId: number, @Body() dto: AdminProcessDayTasksDto) {
    const res = await this.service.processDayTasks(
      userId,
      dto.plan_id,
      dto.date_no,
      dto.tasks,
      dto.need_auto_fill
    );
    return {
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    };
  }

  //  获取计划的每日进度信息
  @Get('plan-day-progress/:planId')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async getPlanDayProgress(@Req() req, @Body('mini_user_id') userId: number, @Param('planId') planId: number, @Query('need_task') needTask: boolean) {
    const res = await this.service.getPlanDayProgress(userId, planId, needTask);
    return res;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async findById(@Req() req, @Param('id') id: number) {
    const res = await this.service.findById(id);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    };  
  }
  
  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async create(@Req() req, @Body() createDto: AdminUserTaskCreateDto,  @Body('mini_user_id') userId: number, @Body('need_auto_plan') needAutoPlan: boolean, @Body('need_auto_fill') needAutoFill: boolean) {
    const res = await this.service.create(userId, createDto, needAutoPlan, needAutoFill);
    return {                                     
      code: HttpStatus.CREATED,
      data: res,
      res: '成功',
    }; 
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RoleGuard('backUser'))
  async delete(@Req() req, @Param('id') id: number,  @Body('mini_user_id') userId: number, @Body('need_auto_plan') needAutoPlan: boolean, @Body('need_auto_fill') needAutoFill: boolean) {
    const res = await this.service.delete(userId, id, needAutoPlan, needAutoFill);
    return {                                     
      code: HttpStatus.OK,
      data: res,
      res: '成功',
    }; 
  }
}
