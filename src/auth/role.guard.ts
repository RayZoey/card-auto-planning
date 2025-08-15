/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-05-08 13:48:03
 * @LastEditors: Ray lighthouseinmind@yeah.net
 * @LastEditTime: 2025-05-08 14:12:48
 * @FilePath: /card/src/auth/role.guard.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {CanActivate, ExecutionContext, Injectable, ForbiddenException, mixin, Type} from '@nestjs/common';

export function RoleGuard(expectedRole: string): Type<CanActivate> {
  @Injectable()
  class RoleGuardMixin implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      const user = request.user;
      if (!user) {
        throw new ForbiddenException(`用户未登录`);
      }
      if (user.client_credentials !== 'all' && user.client_credentials !== expectedRole) {
        throw new ForbiddenException(`接口请求端有误`);
      }

      return true;
    }
  }

  return mixin(RoleGuardMixin);
}
