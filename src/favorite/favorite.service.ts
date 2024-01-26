import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Favorite } from './favorite.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/user/user.entity';
import { GameDto } from '@/game/game.dto';

@Injectable()
export class FavoriteService {
  private logger = new Logger('FavoriteService');

  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getFavoriteGames(userId: number): Promise<GameDto[]> {
    const user = await this.userRepository.findOne({
      where: { uid: userId },
      relations: [
        'favorites',
        'favorites.game',
        'favorites.game.sessions',
        'favorites.game.favorites',
      ],
    });
    return user.favorites
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((favorite) => GameDto.from(favorite.game, userId));
  }

  async toggleFavorite(userId: number, gameId: number): Promise<void> {
    this.logger.log(`add favorite ${userId} ${gameId}`);
    const favorite = await this.favoriteRepository.findOne({
      where: { userId, gameId },
    });
    if (favorite) {
      await this.favoriteRepository.delete(favorite);
    } else {
      await this.favoriteRepository.insert({ userId, gameId });
    }
  }
}
