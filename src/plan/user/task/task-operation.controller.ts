import { Controller, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '@src/auth/jwt-auth.guard';
import { UserTaskService } from './task.service';
import { InsertTaskDto, CutTaskDto, SkipTaskDto, PostponeTaskDto } from './task-operation.dto';

@Controller('user/task-operation')
@UseGuards(JwtAuthGuard)
export class TaskOperationController {
  constructor(private readonly userTaskService: UserTaskService) {}

  /**
   * 插入新任务
   */
  @Post('insert/:planId')
  async insertTask(
    @Param('planId') planId: number,
    @Body() dto: InsertTaskDto,
    @Request() req: any
  ) {
    return await this.userTaskService.insertTask(req.user.id, planId, dto);
  }

  /**
   * 切割任务
   */
  @Post('cut/:planId')
  async cutTask(
    @Param('planId') planId: number,
    @Body() dto: CutTaskDto,
    @Request() req: any
  ) {
    return await this.userTaskService.cutTask(req.user.id, planId, dto);
  }

  /**
   * 跳过任务
   */
  @Post('skip/:planId')
  async skipTask(
    @Param('planId') planId: number,
    @Body() dto: SkipTaskDto,
    @Request() req: any
  ) {
    return await this.userTaskService.skipTask(req.user.id, planId, dto);
  }

  /**
   * 推迟任务
   */
  @Post('postpone/:planId')
  async postponeTask(
    @Param('planId') planId: number,
    @Body() dto: PostponeTaskDto,
    @Request() req: any
  ) {
    return await this.userTaskService.postponeTask(req.user.id, planId, dto);
  }
}
