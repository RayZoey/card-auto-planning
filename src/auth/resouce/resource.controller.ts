import {Controller, Get, UseGuards} from '@nestjs/common';
import {ResourceService} from '@src/auth/resouce/resource.service';
import {JwtAuthGuard} from '@src/auth/jwt-auth.guard';

@Controller('resource')
export class ResourceController {
  constructor(private readonly service: ResourceService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list() {
    // return await this.service.findAll();
  }
}
