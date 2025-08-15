/*
 * @Author: Ray lighthouseinmind@yeah.net
 * @Date: 2025-05-06 16:32:31
 * @LastEditors: Ray lighthouseinmind@yeah.net
 * @LastEditTime: 2025-05-15 15:12:07
 * @FilePath: /water/src/auth/auth.module.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {Module} from '@nestjs/common';
import {JwtModule} from '@nestjs/jwt';
import {JwtStrategy} from '@src/auth/jwt.strategy';
import {PassportModule} from '@nestjs/passport';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {RoleController} from '@src/auth/role/role.controller';
import {RoleService} from '@src/auth/role/role.service';
import {AccountController} from '@src/auth/account/account.controller';
import {AccountService} from '@src/auth/account/account.service';
import {BaseService} from '@src/base/base.service';
import {AuthController} from '@src/auth/account/auth.controller';
import {AuthService} from '@src/auth/account/auth.service';
import {ResourceController} from '@src/auth/resouce/resource.controller';
import {ResourceService} from '@src/auth/resouce/resource.service';
import {UserService} from '@src/wechat/user/user.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          secret: configService.get('SECRET'),
          signOptions: {expiresIn: '600000s'},
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [
    AuthController,
    RoleController,
    AccountController,
    ResourceController,
  ],
  providers: [
    AuthService,
    UserService,
    AccountService,
    JwtStrategy,
    RoleService,
    AccountService,
    BaseService,
    ResourceService
  ],
})
export class AuthModule {}
