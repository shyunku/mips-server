import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from '@/entity/game.entity';
import { Session } from '@/entity/session.entity';
import { GameService } from '@/services/game.service';
import { GameController } from '@/controllers/game.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Game, Session])],
  controllers: [GameController],
  providers: [GameService],
})
export class GameModule {}
