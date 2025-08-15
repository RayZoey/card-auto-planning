/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-04-14 10:51:15
 * @LastEditors: Ray lighthouseinmind@yeah.net
 * @LastEditTime: 2025-05-15 15:27:07
 * @FilePath: /water/src/auth/jwt.strategy.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Injectable, SetMetadata} from '@nestjs/common';
import {PassportStrategy} from '@nestjs/passport';
import {ExtractJwt, Strategy} from 'passport-jwt';
import {ConfigService} from '@nestjs/config';
import {UserService} from '@src/wechat/user/user.service';
import {AccountService} from '@src/auth/account/account.service';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(readonly configService: ConfigService, readonly wechatService: UserService, readonly accountService: AccountService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      secretOrKey: configService.get('SECRET'),
    });
  }

  async validate(payload: any) {
    if (payload.client_credentials == 'backUser') {
      await this.accountService.validateAccountStatus(payload.user_id);
      return {
        accountId: payload.user_id,
        username: payload.username,
        client_credentials: payload.client_credentials,
      };
    } else if (payload.client_credentials == 'miniUser') {
      await this.wechatService.validateUserByOpenId(payload.open_id);
      return {
        accountId: payload.user_id,
        username: payload.username,
        client_credentials: payload.client_credentials,
      };
    }
  }
}
