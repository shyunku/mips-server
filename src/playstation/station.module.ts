import { SessionModule } from '@/session/session.module';
import { SocketModule } from '@/socket/socket.module';
import { Module, forwardRef } from '@nestjs/common';
import { TenSecondsService } from './ten-seconds.service';
import { StationRouterService } from './station-router.service';

@Module({
  imports: [forwardRef(() => SocketModule), forwardRef(() => SessionModule)],
  providers: [TenSecondsService, StationRouterService],
  exports: [StationRouterService],
})
export class StationModule {}
