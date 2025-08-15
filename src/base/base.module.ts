import {Module} from '@nestjs/common';
import {BaseController} from './base.controller';
import {BaseService} from './base.service';
import {OssController} from './oss/oss.controller';

@Module({
  controllers: [BaseController, OssController],
  providers: [BaseService],
})
export class BaseModule {}
