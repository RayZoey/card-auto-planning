import {Controller, Body, Post, Ip} from '@nestjs/common';
import {AuthService} from '@src/auth/account/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/access-tokens')
  async issueAccessToken(
    @Ip() ip: string,
    @Body('username') username,
    @Body('password') password,
    @Body('client_credentials') clientCredentials
  ) {
    return await this.authService.issueAccessToken(ip.substr(7), username, password, clientCredentials);
  }
}
