import {Inject, Injectable, UnauthorizedException} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {QueryConditionParser} from '@src/common/query-condition-parser';
import {QueryFilter} from '@src/common/query-filter';
import {UserQueryCondition} from './user.query-condition';
import {ConfigService} from '@nestjs/config';
import axios from 'axios';
import {UserUpdateDto} from '@src/wechat/user/user.update.dto';
import {BaseService} from '@src/base/base.service';
import Decimal from 'decimal.js';
import {WINSTON_MODULE_PROVIDER} from 'nest-winston';
import {Logger} from 'winston';
import { AuthService } from '@src/auth/account/auth.service';
const _ = require('lodash');
const moment = require('moment');

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    readonly configService: ConfigService,
    readonly baseService: BaseService,
    private readonly queryConditionParser: QueryConditionParser,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  async findAll(queryCondition: UserQueryCondition, offset: number, limit: number) {
    const filter: QueryFilter = this.queryConditionParser.parse(queryCondition);
    return this.prismaService.user.findMany({
      where: filter,
      orderBy: {
        id: 'desc',
      },
      skip: offset,
      take: limit,
    });
  }

  async findTotal(queryCondition: UserQueryCondition): Promise<number> {
    const filter: QueryFilter = this.queryConditionParser.parse(queryCondition);
    return this.prismaService.user.count({
      where: filter,
    });
  }

  async findById(id: number) {
    const user = await this.prismaService.user.findFirst({
      where: {
        id: id,
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        phone: true,
        point: true,
        created_at: true
      }
    });
    if (!user) {
      throw new UnauthorizedException('小程序用户不存在');
    }
    return user;
  }

  async update(id, updateDto: UserUpdateDto) {
    return this.prismaService.user.update({
      data: updateDto,
      where: {
        id,
      },
    });
  }

  async getAccessToken() {
    const MINI_APPID = this.configService.get('MINI_APPID');
    const MINI_APPSECRET = this.configService.get('MINI_APPSECRET');
    const url =
      'https://api.weixin.qq.com/cgi-bin/token?appid=' + MINI_APPID + '&secret=' + MINI_APPSECRET + '&grant_type=client_credential';
    const res = await axios.get(url).then((res) => {
      if (res.status != 200 || !res.data.access_token) {
        throw new Error(res.data.errmsg);
      }
      return res.data;
    });
    return res.access_token;
  }

  async randomScore(minNum: number, maxNum: number) {
    const min = Math.ceil(minNum);
    const max = Math.floor(maxNum);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  //    设置手机号
  async setMobile(userId: number, code: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        id: true,
        username: true
      },
    });
    if (!user) {
      throw new Error('小程序用户不存在');
    }
    const token = await this.getAccessToken();
    const url = 'https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=' + token;
    const phone = await axios
      .post(url, {
        code: code,
      })
      .then((res) => {
        if (res.status == 200 && res.data.errcode == 0) {
          return res.data.phone_info.phoneNumber;
        } else {
          throw new Error(res.data.errmsg);
        }
      });
    //  更新用户信息
    await this.prismaService.user.update({
      where: {
        id: userId,
      },
      data: {
        phone: phone
      },
    });
    return {
      phone,
    };
  }

  //    获取openid并创建/查询用户记录
  async getOpenIdAndCheckUserRecord(code: string) {
    const MINI_APPID = this.configService.get('MINI_APPID');
    const MINI_APPSECRET = this.configService.get('MINI_APPSECRET');
    const url =
      'https://api.weixin.qq.com/sns/jscode2session?appid=' +
      MINI_APPID +
      '&secret=' +
      MINI_APPSECRET +
      '&js_code=' +
      code +
      '&grant_type=authorization_code';
    const res = await axios.get(url).then((res) => {
      if (res.status != 200 || !res.data.openid) {
        throw new Error(res.data.errmsg);
      }
      return res.data;
    });
    let miniUser = await this.prismaService.user.findFirst({
      where: {
        open_id: res['openid'],
      },
    });
    if (!miniUser) {
      miniUser = await this.prismaService.user.create({
        data: {
          open_id: res['openid'],
        },
      });
    }
    const token = await axios
      .post('http://127.0.0.1:3001/auth/access-tokens', {
        ip: 'null',
        username: res['openid'],
        password: null,
        client_credentials: 'miniUser',
      })
      .then((res) => {
        if (res.status == 201) {
          return res.data.accessToken;
        } else {
          throw new Error(res.data);
        }
      });
    return {
      mini_user_id: miniUser.id,
      // session_key: res['session_key'],
      token: token
    };
  }

  async validateUserByOpenId(openId: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        open_id: openId,
      },
    });
    if (!user) {
      throw new UnauthorizedException('小程序用户不存在');
    }
    return user;
  }

  //  绑定督学导师
  async bindTeacher(userId: number, teacherId: number, days: number){
    const teacher = await this.prismaService.teacher.findFirst({
      where: {
        id: teacherId,
        is_enable: true,
      },
    });
    if (!teacher) {
      throw new Error('督学导师不存在或被禁用');
    }
    await this.prismaService.userAndTeacherRelation.deleteMany({
      where: {
        user_id: userId,
        teacher_id: teacherId,
      },
    });
    return await this.prismaService.userAndTeacherRelation.create({
      data: {
        user_id: userId,
        teacher_id: teacherId,
        start_time: moment().utcOffset(0).format(),
        end_time: moment().utcOffset(0).add(days, 'days').format(),
      },
    });
  }

}