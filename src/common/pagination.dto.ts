import {Expose, Type} from 'class-transformer';
import {IsInt, IsOptional, IsPositive, Max, Min} from 'class-validator';
import {Default} from '@src/common/default.transformer';

export class PaginationDto {
  @Expose({name: 'page_size'})
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  @Max(5000)
  @Default(999)
  @IsInt()
  pageSize: number;

  @Expose()
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  @Min(1)
  @Default(1)
  @IsInt()
  page: number;
}
