import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { AppService } from '../services/app.service';
import { GameService } from '@/services/game.service';
import { Game } from '@/entity/game.entity';
import { GameSession } from '@/entity/game_session.entity';
import { SessionService } from '@/services/session.service';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get()
  async getGame(@Query('id') id: number): Promise<Game> {
    return await this.gameService.getGame(id);
  }

  @Get('all')
  async getAllGames(): Promise<Game[]> {
    return await this.gameService.getGames();
  }
}
