import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { AppService } from '../services/app.service';
import { GameService } from '@/services/game.service';
import { Game } from '@/entity/game.entity';
import { GameSession } from '@/entity/game_session.entity';

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

  @Get('sessions')
  async getSessions(@Query('uid') uid: number): Promise<GameSession[]> {
    return await this.gameService.getSessions(uid);
  }

  @Get('session')
  async getSession(@Query('sessionId') id: number): Promise<GameSession> {
    return await this.gameService.getSession(id);
  }

  @Delete('session')
  async deleteSession(@Query('sessionId') id: number): Promise<void> {
    await this.gameService.deleteSession(id);
  }

  // TODO :: remove uid later (replace to token)
  @Post('createSession')
  async createSession(
    @Body('gameId') gameId: number,
    @Body('uid') uid: number,
    @Body('password') password: string | null,
  ): Promise<GameSession> {
    return await this.gameService.createSession(gameId, uid, password);
  }
}
