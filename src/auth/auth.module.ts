import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { UserService } from '@/user/user.service';
import { UserModule } from '@/user/user.module';

ConfigService;

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_SECRET_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    forwardRef(() => UserModule),
  ],
  providers: [JwtStrategy, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
