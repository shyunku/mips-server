import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { AppService } from '../services/app.service';
import { GameService } from '@/services/game.service';
import { Game } from '@/entity/game.entity';
import { GameSession } from '@/entity/game_session.entity';
import { SessionService } from '@/services/session.service';

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('sessions')
  async getSessions(@Query('uid') uid: number): Promise<GameSession[]> {
    return await this.sessionService.getSessions(uid);
  }

  @Get('')
  async getSession(@Query('sessionId') id: number): Promise<GameSession> {
    return await this.sessionService.getSession(id);
  }

  @Post('find')
  async findSession(@Body('code') code: string): Promise<null | boolean> {
    const found = await this.sessionService.getSessionByCode(code);
    if (!found) return null;
    return found.password != null;
  }

  @Post('join')
  async joinSession(
    @Body('code') code: string,
    @Body('uid') uid: number,
    @Body('password') password: string | null,
  ): Promise<GameSession> {
    return await this.sessionService.joinSession(code, uid, password);
  }

  @Delete('')
  async deleteSession(@Query('sessionId') id: number): Promise<void> {
    await this.sessionService.deleteSession(id);
  }

  // TODO :: remove uid later (replace to token)
  @Post('create')
  async createSession(
    @Body('gameId') gameId: number,
    @Body('uid') uid: number,
    @Body('password') password: string | null,
  ): Promise<GameSession> {
    return await this.sessionService.createSession(gameId, uid, password);
  }
}
