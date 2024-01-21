import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AppService } from '../app/app.service';
import { GameService } from '@/game/game.service';
import { Game } from '@/game/game.entity';
import { GameSession } from '@/session/session.entity';
import { SessionService } from '@/session/session.service';
import { AuthGuard } from '@nestjs/passport';
import { SessionCreateDto } from './session.dto';

@Controller('session')
@UseGuards(AuthGuard('jwt'))
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('sessions')
  async getSessions(@Request() req): Promise<GameSession[]> {
    return await this.sessionService.getSessions(req.user.uid);
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
    @Request() req,
    @Body('code') code: string,
    @Body('password') password: string | null,
  ): Promise<GameSession> {
    return await this.sessionService.joinSession(code, req.user.uid, password);
  }

  @Post('create')
  async createSession(
    @Request() req,
    @Body('gameId') gameId: number,
    @Body('password') password: string | null,
  ): Promise<SessionCreateDto> {
    return await this.sessionService.createSession(
      gameId,
      req.user.uid,
      password,
    );
  }

  @Delete('')
  async deleteSession(
    @Request() req,
    @Query('sessionId') id: number,
  ): Promise<void> {
    const uid = req.user.uid;
    const session = await this.sessionService.getSession(id);
    if (session.creator.uid !== uid) {
      throw new HttpException(
        `user ${uid} is not creator of session ${id}`,
        HttpStatus.FORBIDDEN,
      );
    }
    await this.sessionService.deleteSession(id);
  }
}
