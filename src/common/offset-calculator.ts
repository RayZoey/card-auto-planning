import {Injectable} from '@nestjs/common';

@Injectable()
export class OffsetCalculator {
  calculate(page: number, pageSize: number): number {
    return (page - 1) * pageSize;
  }
}
