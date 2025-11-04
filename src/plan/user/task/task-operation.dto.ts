import { IsEnum, IsInt, IsOptional, IsString, IsDateString, IsBoolean, Min, Max } from 'class-validator';
import { TaskTimingType, TaskAnnexType } from '@prisma/client';

export class InsertTaskDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  @Max(10)
  priority: number;

  @IsOptional()
  @IsString()
  background?: string;

  @IsOptional()
  @IsString()
  suggested_time_start?: string;

  @IsOptional()
  @IsString()
  suggested_time_end?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsEnum(TaskAnnexType)
  annex_type?: TaskAnnexType;

  @IsOptional()
  @IsString()
  annex?: string;

  @IsEnum(TaskTimingType)
  timing_type: TaskTimingType;

  @IsOptional()
  @IsInt()
  @Min(1)
  occupation_time?: number;

  @IsBoolean()
  can_divisible: boolean;

  @IsOptional()
  @IsInt()
  task_group_id?: number;

  @IsDateString()
  target_date: string; // 插入到哪一天

  @IsOptional()
  @IsInt()
  @Min(0)
  target_seq?: number; // 插入到该天的第几个位置，不传则插入到最后
}

export class CutTaskDto {
  @IsInt()
  task_id: number;

  @IsInt()
  @Min(2)
  segments_count: number; // 分割成几段

  @IsOptional()
  @IsDateString()
  target_date?: string; // 如果指定，则第一段放到指定日期，否则保持原日期
}

export class SkipTaskDto {
  @IsInt()
  task_id: number;

  @IsOptional()
  @IsString()
  reason?: string; // 跳过原因
}

export class PostponeTaskDto {
  @IsInt()
  task_id: number;

  @IsDateString()
  new_date: string; // 推迟到哪一天

  @IsOptional()
  @IsInt()
  @Min(0)
  new_seq?: number; // 在新日期的位置，不传则插入到最后
}

export class TaskOperationResponse {
  success: boolean;
  message?: string;
  validation?: {
    isValid: boolean;
    currentMinutes: number;
    maxMinutes: number;
    message?: string;
  };
  data?: any;
}
