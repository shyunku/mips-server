import { Module, forwardRef } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { AuthModule } from '@/auth/auth.module';
import { JwtService } from '@nestjs/jwt';
import { UserModule } from '@/user/user.module';
import { SocketService } from './socket.service';
import { SessionModule } from '@/session/session.module';
import { StationModule } from '@/playstation/station.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    forwardRef(() => SessionModule),
    forwardRef(() => StationModule),
  ],
  providers: [SocketGateway, SocketService],
  exports: [SocketService],
})
export class SocketModule {}
