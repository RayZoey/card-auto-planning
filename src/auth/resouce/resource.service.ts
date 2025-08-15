import {Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {ResourceDto} from './resource.dto';

@Injectable()
export class ResourceService {
  constructor(private readonly prismaService: PrismaService) {}

  // async findAll() {
  //   return await this.prismaService.menu
  //     .findMany({
  //       include: {
  //         operation: true,
  //       }
  //     })
  // }
  //
  // async resourceAuthor(id: number, dto: ResourceDto[]){
  //   await this.prismaService.resourceAuthor.deleteMany({
  //     where: {
  //       role_id: id
  //     }
  //   });
  //   return await this.prismaService.resourceAuthor.createMany({
  //     // @ts-ignore
  //     data: dto,
  //   });
  // }
}
