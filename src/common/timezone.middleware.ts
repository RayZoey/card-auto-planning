
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as moment from 'moment-timezone';

@Injectable()
export class DeepTimezoneMiddleware implements NestMiddleware {
  private convertTZ(data: any): any {
    if (!data) return data;
    
    if (Array.isArray(data)) {
      return data.map(item => this.convertTZ(item));
    }

    if (typeof data === 'object' && data !== null) {
      return Object.entries(data).reduce((acc, [key, value]) => {
        if (key.toLowerCase().includes('_data_time') || key.toLowerCase().includes('_at')) {
          if (typeof value === 'string' && !isNaN(Date.parse(value))) {
              acc[key] = moment(value).tz('Asia/Shanghai').format();
            } else if (value instanceof Date) {
              acc[key] = moment(value).tz('Asia/Shanghai').format();
            }else {
              acc[key] = value;
            }
        } else if (typeof value === 'object') {
          acc[key] = this.convertTZ(value);
        } else {
          acc[key] = value;
        }
        return acc;
      }, {});
    }

    return data;
  }

  use(req: Request, res: Response, next: NextFunction) {
    const originalJson = res.json;
    res.json = (body) => {
      return originalJson.call(res, this.convertTZ(body));
    };
    next();
  }
}
