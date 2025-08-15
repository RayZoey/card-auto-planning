import {ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Inject} from '@nestjs/common';
import {WINSTON_MODULE_PROVIDER} from 'nest-winston';
import {Logger} from 'winston';
import {Response} from 'express';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const error = exception instanceof HttpException ? exception.getResponse()['error'] : '操作失败，请检查传递参数';
    let message = exception instanceof HttpException ? exception.getResponse()['message'] : exception.toString();
    if (exception['code']) {
      switch (exception['code']) {
        case 'P2002':
          message = '唯一键冲突，已存在重复数据';
          break;
        case 'P2006':
          message = '字段类型不合法';
          break;
        case 'P2012':
          message = '缺少必传字段';
          break;
        case 'P2016':
          message = '查询失败';
          break;
      }
    }

    const reqUser = request['user'];
    let userId: number;
    if (reqUser && reqUser.client_credentials == 'miniUser') {
      userId = reqUser.accountId;
    }

    const errMsg = `HTTP Status: ${status} Error Message: ${exception instanceof Error ? exception.message : exception}`;
    // 记录错误日志
    this.logger.error(userId ? `${errMsg} - ${userId}` : errMsg);
    if (exception instanceof Error) {
      this.logger.error(exception.stack);
    }

    response.status(status).json({
      error,
      message,
    });
  }
}
