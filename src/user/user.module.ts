import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/user/user.entity';
import { UserController } from '@/user/user.controller';
import { UserService } from '@/user/user.service';
import { AuthService } from '@/auth/auth.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
