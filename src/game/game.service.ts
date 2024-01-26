import { Game } from '@/game/game.entity';
import { SESSION_STATUS, GameSession } from '@/session/session.entity';
import { User } from '@/user/user.entity';
import { generateNumCode } from '@/utils/common.util';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { GameDto } from './game.dto';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game) private readonly gameRepository: Repository<Game>,
  ) {}

  async getGame(id: number, userId: number): Promise<GameDto> {
    const game = await this.gameRepository.findOne({
      where: { gid: id },
      relations: ['sessions', 'favorites'],
    });
    if (!game) {
      throw new HttpException(
        `can't find game with id ${id}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return GameDto.from(game, userId);
  }

  async getGamesByName(keyword: string, userId: number): Promise<GameDto[]> {
    const games = await this.gameRepository
      .createQueryBuilder('game')
      .where('game.name LIKE :keyword OR game.description LIKE :keyword', {
        keyword: `%${keyword}%`,
      })
      .leftJoinAndSelect('game.sessions', 'session')
      .leftJoinAndSelect('game.favorites', 'favorite')
      .getMany();
    return games.map((game) => GameDto.from(game, userId));
  }

  async getGames(userId: number): Promise<GameDto[]> {
    const games = await this.gameRepository.find({
      relations: ['sessions', 'favorites'],
    });
    return games.map((game) => GameDto.from(game, userId));
  }
}
