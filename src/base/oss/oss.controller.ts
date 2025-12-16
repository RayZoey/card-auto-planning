/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-04-14 10:51:15
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2025-12-16 22:35:21
 * @FilePath: /water/src/base/oss/oss.controller.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Body, CACHE_MANAGER, Controller, Inject, HttpStatus, Res, Post, UploadedFiles, UseInterceptors} from '@nestjs/common';
import {FilesInterceptor} from '@nestjs/platform-express';
import {BaseService} from '@src/base/base.service';
import {Response} from 'express';

@Controller('base/oss')
export class OssController {
  constructor(readonly baseService: BaseService) {}

  /**
   * 多文件上传oss
   */
  @Post('')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadOSS(@UploadedFiles() files, @Res() response: Response, @Body('directory') directory: string) {
    const r = await this.baseService.uploadOSS(files, directory, true, false);
    response.status(HttpStatus.CREATED).send({
      code: HttpStatus.CREATED,
      data: r,
      res: '成功',
    });
  }
}
