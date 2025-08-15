import {Controller, Get, Query, DefaultValuePipe} from '@nestjs/common';
import {CollectionResource} from '@src/common/collection-resource';
import {PaginationDto} from '@src/common/pagination.dto';
import {OffsetCalculator} from '@src/common/offset-calculator';

import {BaseService} from './base.service';

@Controller('base')
export class BaseController {
  constructor(private readonly baseService: BaseService, private offsetCalculator: OffsetCalculator) {}
}
