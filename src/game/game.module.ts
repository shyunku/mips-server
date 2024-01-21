import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from '@/game/game.entity';
import { GameSession } from '@/session/session.entity';
import { GameService } from '@/game/game.service';
import { GameController } from '@/game/game.controller';
import { User } from '@/user/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Game])],
  controllers: [GameController],
  providers: [GameService],
})
export class GameModule {}
