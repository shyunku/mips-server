import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppService } from '../app/app.service';
import { GameService } from '@/game/game.service';
import { Game } from '@/game/game.entity';
import { GameSession } from '@/session/session.entity';
import { SessionService } from '@/session/session.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('game')
@UseGuards(AuthGuard('jwt'))
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
