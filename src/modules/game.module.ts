import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from '@/entity/game.entity';
import { GameSession } from '@/entity/game_session.entity';
import { GameService } from '@/services/game.service';
import { GameController } from '@/controllers/game.controller';
import { User } from '@/entity/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Game])],
  controllers: [GameController],
  providers: [GameService],
})
export class GameModule {}
