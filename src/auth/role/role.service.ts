import {Injectable} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {RoleUpdateDto} from '@src/auth/role/role.update.dto';
import {RoleCreateDto} from '@src/auth/role/role.create.dto';
var _ = require('lodash');

@Injectable()
export class RoleService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(offset: number, limit: number) {
    return await this.prismaService.role.findMany({
      where: {
        deleted_at: null,
      },
      orderBy: {
        id: 'desc',
      },
      skip: offset,
      take: limit,
    });
  }

  async findTotal(): Promise<number> {
    return await this.prismaService.role.count({
      where: {
        deleted_at: null,
      },
    });
  }

  async create(createDto: RoleCreateDto) {
    return await this.prismaService.role.create({
      data: createDto,
    });
  }

  async update(id: number, updateDto: RoleUpdateDto) {
    return await this.prismaService.role.update({
      data: updateDto,
      where: {
        id,
      },
    });
  }

  async delete(id: number) {
    return await this.prismaService.role.update({
      data: {
        deleted_at: new Date(),
      },
      where: {
        id,
      },
    });
  }
}
