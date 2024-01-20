import { Game } from '@/entity/game.entity';
import { SESSION_STATUS, GameSession } from '@/entity/game_session.entity';
import { User } from '@/entity/user.entity';
import { generateNumCode } from '@/utils/common.util';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game) private readonly gameRepository: Repository<Game>,
    @InjectRepository(GameSession)
    private readonly sessionRepository: Repository<GameSession>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
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

  async getEndedSessionCount(): Promise<number> {
    return await this.sessionRepository.count({
      where: { status: SESSION_STATUS.ENDED },
    });
  }

  async getSessions(uid: number): Promise<GameSession[]> {
    return await this.sessionRepository.find({
      where: { creator: { uid } },
      relations: ['creator', 'game', 'participants'],
    });
  }

  async getSession(id: number): Promise<GameSession> {
    return await this.sessionRepository.findOne({
      where: { id },
      relations: ['creator', 'game', 'participants'],
    });
  }

  async createSession(
    gameId: number,
    uid: number,
    password: string | null,
  ): Promise<GameSession> {
    const user = await this.userRepository.findOne({ where: { uid } });
    if (!user) {
      throw new HttpException(
        `can't find user with id ${uid}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const game = await this.gameRepository.findOne({ where: { gid: gameId } });
    if (!game) {
      throw new HttpException(
        `can't find game with id ${gameId}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const session = new GameSession();
    session.game = game;
    session.code = generateNumCode(6);
    session.password = password;
    session.status = SESSION_STATUS.WAITING;
    session.creator = user;
    session.participants = [user];
    return await this.sessionRepository.save(session);
  }

  async deleteSession(id: number): Promise<void> {
    await this.sessionRepository.delete({ id });
  }
}
