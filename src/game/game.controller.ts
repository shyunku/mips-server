import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AppService } from '../app/app.service';
import { GameService } from '@/game/game.service';
import { Game } from '@/game/game.entity';
import { GameSession } from '@/session/session.entity';
import { SessionService } from '@/session/session.service';
import { AuthGuard } from '@nestjs/passport';
import { GameDto } from './game.dto';

@Controller('game')
@UseGuards(AuthGuard('jwt'))
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get()
  async getGame(@Request() req, @Query('id') id: number): Promise<GameDto> {
    return await this.gameService.getGame(id, req.user.uid);
  }

  @Get('all')
  async getAllGames(@Request() req): Promise<GameDto[]> {
    return await this.gameService.getGames(req.user.uid);
  }

  @Post('find')
  async findGame(
    @Request() req,
    @Body('keyword') keyword: string,
  ): Promise<GameDto[]> {
    return await this.gameService.getGamesByName(keyword, req.user.uid);
  }
}
