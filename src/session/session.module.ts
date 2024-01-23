import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from '@/game/game.entity';
import { GameSession } from '@/session/session.entity';
import { User } from '@/user/user.entity';
import { SessionService } from '@/session/session.service';
import { SessionController } from '@/session/session.controller';
import { SocketModule } from '@/socket/socket.module';
import { StationModule } from '@/playstation/station.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game, GameSession, User]),
    SocketModule,
    StationModule,
  ],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
