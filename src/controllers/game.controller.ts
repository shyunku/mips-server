import { Controller, Get } from '@nestjs/common';
import { AppService } from '../services/app.service';
import { GameService } from '@/services/game.service';
import { Game } from '@/entity/game.entity';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('all')
  async getAllGames(): Promise<Game[]> {
    return await this.gameService.findAll();
  }
}
