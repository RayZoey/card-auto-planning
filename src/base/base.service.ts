import {Body, Injectable, UploadedFiles} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {createHash} from 'crypto';
import {random} from 'lodash';
import {ConfigService} from '@nestjs/config';
const Duplex = require('stream').Duplex;
const _ = require('lodash');
const moment = require('moment');
const ObsClient = require("esdk-obs-nodejs");

@Injectable()
export class BaseService {
  constructor(private readonly prismaService: PrismaService, readonly configService: ConfigService) {}

  //  查视图
  async findStaffAll(offset: number, limit: number, id?: number, type?: string, isDeleted?: number) {
    const whereSql = this.appendFilter(id, type, isDeleted);
    // @ts-ignore
    return await this.prismaService.$queryRaw(`SELECT * FROM staff ${whereSql} OFFSET ${offset} LIMIT ${limit}`);
  }

  appendFilter(id?: number, type?: string, isDeleted?: number) {
    let whereSql = `WHERE 1 = 1`;
    if (id && id > 0) {
      whereSql += ` AND id = ${id}`;
    }
    if (type) {
      whereSql += ` AND type = '${type}'`;
    }
    if (isDeleted == 1) {
      whereSql += ` AND deleted_at is not null`;
    } else if (isDeleted == -1) {
      whereSql += ` AND deleted_at is null`;
    }
    return whereSql;
  }

  // 加密
  async encryption(pwd) {
    return createHash('md5')
      .update('yak' + pwd)
      .digest('hex');
  }

  //  中文url编码
  async encodeURI(str: string) {
    return str.replace(/([\u4e00-\u9fa5])/g, function (str) {
      return encodeURIComponent(str);
    });
  }

  async bufferToStream(buffer) {
    let stream = new Duplex();
    stream.push(buffer);
    stream.push(null);
    return stream;
  }

  async randomStr(length) {
    let numbers = '0123456789';
    let letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let total = '';
    total += numbers += letters;
    let result = '';

    while (length > 0) {
      //循环次数是指定长度
      length--;
      result += total[Math.floor(Math.random() * total.length)];
    }
    return result;
  }

  async generateOrderSn(prefix: string) {
    const now = moment().utcOffset(0).format('HHMMSS');
    const randomCode = await this.randomStr(6);
    return prefix + now + randomCode;
  }

  //  上传文件至OSS
  async uploadOSS(@UploadedFiles() files: any) {
    const filesList = [];

    // 创建ObsClient实例
    const obsClient = new ObsClient({
      access_key_id: this.configService.get('OBS_ACCESS_ID'),
      secret_access_key: this.configService.get('OBS_ACCESS_KEY'),
      server: this.configService.get('OBS_ENDPOINT')
    });

    for (const index in files) {

      const stream = await this.bufferToStream(files[index].buffer);
      const fileName = random(0, 999) + '-' + random(0, 999) + '-' + files[index]['originalname'];
      const path = '/hsdr/' + moment().format('YYYY-MM') + '/' + fileName;
      const params = {
        Bucket: "test-glzt",
        Key: path,
        Body: stream  //  华为云不支持直接上传buffer
      };
      const result = await obsClient.putObject(params);
      if (result.CommonMsg.Status <= 300) {
        filesList.push(path);
      }else {
        throw new Error('文件上传服务错误');
      }
    }
      return filesList

  }

  //  判断正整数
  async isPositiveInteger(num) {
    const regex = /^[1-9]\d*$/;
    return regex.test(num);
  }

  //  今天开始/结束时间
  async returnToDayTime() {
    const startTime = new Date(new Date(new Date().toLocaleDateString()).getTime());
    const endTime = new Date(new Date(new Date().toLocaleDateString()).getTime() + 24 * 60 * 60 * 1000 - 1);
    return {
      startTime: startTime,
      endTime: endTime,
    };
  }
}
