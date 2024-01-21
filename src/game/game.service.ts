import { Game } from '@/game/game.entity';
import { SESSION_STATUS, GameSession } from '@/session/session.entity';
import { User } from '@/user/user.entity';
import { generateNumCode } from '@/utils/common.util';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game) private readonly gameRepository: Repository<Game>,
  ) {}

  async getGame(id: number): Promise<Game> {
    const game = await this.gameRepository.findOne({ where: { gid: id } });
    if (!game) {
      throw new HttpException(
        `can't find game with id ${id}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return game;
  }

  async getGames(): Promise<Game[]> {
    return await this.gameRepository.find();
  }
}
