import {Body, Injectable, UploadedFiles} from '@nestjs/common';
import {PrismaService} from '@src/common/prisma.service';
import {createHash} from 'crypto';
import {random} from 'lodash';
import {ConfigService} from '@nestjs/config';
const Duplex = require('stream').Duplex;
const _ = require('lodash');
const moment = require('moment');
const OSS = require('ali-oss');
import * as iconv from 'iconv-lite';
import { createReadStream, createWriteStream } from 'fs';

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
  async uploadOSS(@UploadedFiles() files: any, @Body('directory') directory: string, needConfound: boolean, needUnzip: boolean = false) {
    const client = new OSS({
      endpoint: this.configService.get('ENDPOINT'), // endpoint域名
      accessKeyId: this.configService.get('ACCESSKEYID'), // 账号
      accessKeySecret: this.configService.get('ACCESSKEYSECRET'), // 密码
      bucket: this.configService.get('BUCKET'), // 存储桶
      region: this.configService.get('REGION'),
    });
    let result = {
      err: 0,
      success: 0,
      success_link: [],
      success_unzip_target_link: [],
      success_link_kv: [],
    };
    for (const index in files) {
      let res, fileName;
      //  需要混淆文件名
      if (needConfound) {
        fileName = random(0, 999) + '-' + random(0, 999) + '-' + files[index]['originalname'];
      } else {
        fileName = files[index]['originalname'];
      }
      // fileName = await this.encodeURI(fileName);
      //  如果需要解压缩就不能指定目录
      if (needUnzip && directory) {
        throw new Error('如果需要解压缩则不能指定目录');
      }
      //  如果需要解压缩则需要固定目录
      if (directory == undefined) {
        res = await client.put('auto-plan' + '/' + fileName, files[index]['buffer']);
      }else {
        res = await client.put('auto-plan' + '/' + directory + '/' + fileName, files[index]['buffer']);
      }
      if (res['res'] || res['res']['status'] == 200) {
        const successLink = res['url'].replace('http://', 'https://');
        result['success'] += 1;
        result['success_link'].push(successLink);
      } else {
        result['err'] += 1;
      }
    }
    return result;
  }
  
  // 去除zip后缀的函数
  async removeZipSuffix(url) {
      const zipSuffixIndex = url.lastIndexOf('.zip');
      if (zipSuffixIndex !== -1) {
          return url.slice(0, zipSuffixIndex);
      }
      return url;
  }


  async getOssFile(fileName) {
    const client = new OSS({
      endpoint: this.configService.get('ENDPOINT'), // endpoint域名
      accessKeyId: this.configService.get('ACCESSKEYID'), // 账号
      accessKeySecret: this.configService.get('ACCESSKEYSECRET'), // 密码
      bucket: this.configService.get('BUCKET'), // 存储桶
      region: this.configService.get('REGION'),
    });
    return client.get(fileName);
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
