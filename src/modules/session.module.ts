import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from '@/entity/game.entity';
import { GameSession } from '@/entity/game_session.entity';
import { User } from '@/entity/user.entity';
import { SessionService } from '@/services/session.service';
import { SessionController } from '@/controllers/session.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Game, GameSession, User])],
  controllers: [SessionController],
  providers: [SessionService],
})
export class SessionModule {}
