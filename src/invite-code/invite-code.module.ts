/*
 * @Author: Reflection lighthouseinmind@yeah.net
 * @Date: 2025-08-25 21:59:11
 * @LastEditors: Reflection lighthouseinmind@yeah.net
 * @LastEditTime: 2026-02-04 21:49:46
 * @FilePath: /card-auto-planning/src/teacher/teacher.module.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Module} from '@nestjs/common';
import { InviteCodeController } from './invite-code.controller';
import { InviteCodeService } from './invite-code.service';

@Module({
  controllers: [InviteCodeController],
  providers: [InviteCodeService],
})
export class InviteCodeModule {}
