import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '@src/auth/jwt-auth.guard';
import { DailyValidationService } from './daily-validation.service';
import { TaskTimingType } from '@prisma/client';

@Controller('user/daily-validation')
@UseGuards(JwtAuthGuard)
export class DailyValidationController {
  constructor(private readonly dailyValidationService: DailyValidationService) {}

  /**
   * 验证当日任务时间配置
   */
  @Post('validate/:planId')
  async validateDailyTasks(
    @Param('planId') planId: number,
    @Body() body: {
      date: string;
      additionalTask?: {
        timing_type: TaskTimingType;
        occupation_time?: number;
      };
    },
    @Request() req: any
  ) {
    const result = await this.dailyValidationService.validateDailyTasks(
      planId, 
      body.date, 
      body.additionalTask
    );
    
    return {
      code: 200,
      data: result,
      message: '验证完成'
    };
  }

  /**
   * 获取当日任务概览
   */
  @Get('overview/:planId')
  async getDailyTaskOverview(
    @Param('planId') planId: number,
    @Query('date') date: string,
    @Request() req: any
  ) {
    const result = await this.dailyValidationService.getDailyTaskOverview(planId, date);
    
    return {
      code: 200,
      data: result,
      message: '获取成功'
    };
  }
}
