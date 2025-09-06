import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class DateInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map(data => this.transform(data)),
    );
  }

  private transform(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (obj instanceof Date) return obj.toISOString();
    if (Array.isArray(obj)) return obj.map(v => this.transform(v));
    if (typeof obj === 'object') {
      const res: any = {};
      for (const [k, v] of Object.entries(obj)) res[k] = this.transform(v);
      return res;
    }
    return obj;
  }
}