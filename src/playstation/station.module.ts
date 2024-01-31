import { SessionModule } from '@/session/session.module';
import { SocketModule } from '@/socket/socket.module';
import { Module, forwardRef } from '@nestjs/common';
import { TenSecondsService } from './ten-seconds.service';
import { StationRouterService } from './station-router.service';
import { UserModule } from '@/user/user.module';
import { MafiaService } from './mafia.service';
import { SevenPokerNoChipService } from './seven-poker-nochip.service';

@Module({
  imports: [
    forwardRef(() => SocketModule),
    forwardRef(() => SessionModule),
    UserModule,
  ],
  providers: [
    StationRouterService,
    TenSecondsService,
    MafiaService,
    SevenPokerNoChipService,
  ],
  exports: [StationRouterService],
})
export class StationModule {}
