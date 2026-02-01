/*
 * @Description: 学习状态反馈（修改任务状态）DTO
 */
import { TaskStatus } from '@prisma/client';
import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class ChangeTaskStatusDto {
  @Expose({ name: 'status' })
  @Type(() => String)
  status: TaskStatus;

  /** 完成时是否创建延续任务 */
  @Expose({ name: 'need_continuation' })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  need_continuation?: boolean;

  /** 延续任务占用时间 = 原任务占用时间 * 延续百分比，0~1 小数，如 0.2、0.5 */
  @Expose({ name: 'continuation_percentage' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0, { message: '延续百分比不能小于 0' })
  @Max(1, { message: '延续百分比不能大于 1' })
  continuation_percentage?: number;
}
