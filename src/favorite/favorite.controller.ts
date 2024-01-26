import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { AuthGuard } from '@nestjs/passport';
import { GameDto } from '@/game/game.dto';

@Controller('favorite')
@UseGuards(AuthGuard('jwt'))
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Get('getGames')
  async getFavoriteGames(@Request() req): Promise<GameDto[]> {
    const uid = req.user.uid;
    return await this.favoriteService.getFavoriteGames(uid);
  }

  @Post('toggle')
  async toggleFavorite(
    @Request() req,
    @Body('gameId') gameId: number,
  ): Promise<void> {
    const uid = req.user.uid;
    await this.favoriteService.toggleFavorite(uid, gameId);
  }
}
