import { SessionModule } from '@/session/session.module';
import { SocketModule } from '@/socket/socket.module';
import { Module, forwardRef } from '@nestjs/common';
import { TenSecondsService } from './ten-seconds.service';
import { StationRouterService } from './station-router.service';
import { UserModule } from '@/user/user.module';
import { MafiaService } from './mafia.service';

@Module({
  imports: [
    forwardRef(() => SocketModule),
    forwardRef(() => SessionModule),
    UserModule,
  ],
  providers: [StationRouterService, TenSecondsService, MafiaService],
  exports: [StationRouterService],
})
export class StationModule {}
