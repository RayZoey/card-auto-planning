/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-04-14 10:51:15
 * @LastEditors: Ray lighthouseinmind@yeah.net
 * @LastEditTime: 2025-05-20 17:56:42
 * @FilePath: /water/src/auth/account/auth.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Injectable, UnauthorizedException} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {AccountService} from '@src/auth/account/account.service';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService, private accountService: AccountService) {}

  async issueAccessToken(ip: string, username: string, password: string, clientCredentials: 'backUser' | 'miniUser'): Promise<any> {
    let payload = await this.accountService.validateAccount(username, password, clientCredentials);
    if (payload) {
      if (clientCredentials == 'backUser') {
        await this.accountService.login(payload.user_id, ip);
      }
      const sign = await this.jwtService.sign(payload);
      return {
        accessToken: sign,
        payload: {
          username: payload.username,
          display_name: payload.display_name,
          user_id: payload.user_id,
          client_credentials: payload.client_credentials,
        },
      };
    }
    throw new UnauthorizedException();
  }
}
