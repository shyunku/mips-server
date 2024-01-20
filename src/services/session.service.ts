import { Game } from '@/entity/game.entity';
import { GameSession, SESSION_STATUS } from '@/entity/game_session.entity';
import { User } from '@/entity/user.entity';
import { generateNumCode } from '@/utils/common.util';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    @InjectRepository(GameSession)
    private readonly sessionRepository: Repository<GameSession>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getEndedSessionCount(): Promise<number> {
    return await this.sessionRepository.count({
      where: { status: SESSION_STATUS.ENDED },
    });
  }

  async getSessions(uid: number): Promise<GameSession[]> {
    const user = await this.userRepository.findOne({
      where: { uid },
      // with joinedSessions, and session.game
      relations: [
        'joinedSessions',
        'joinedSessions.game',
        'joinedSessions.creator',
        'joinedSessions.participants',
      ],
    });
    return user.joinedSessions;
  }

  async getSession(id: number): Promise<GameSession> {
    return await this.sessionRepository.findOne({
      where: { id },
      relations: ['creator', 'game', 'participants'],
    });
  }

  async getSessionByCode(code: string): Promise<GameSession> {
    return await this.sessionRepository.findOne({
      where: { code },
      relations: ['creator', 'game', 'participants'],
    });
  }

  async joinSession(
    code: string,
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
    const session = await this.sessionRepository.findOne({
      where: { code },
      relations: ['participants', 'game'],
    });
    if (!session) {
      throw new HttpException(
        `can't find session with code ${code}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (session.password && session.password !== password) {
      throw new HttpException(`password is incorrect`, HttpStatus.BAD_REQUEST);
    }
    session.participants = [...session.participants, user];
    if (session.participants.length > session.game.maxMembers) {
      session.status = SESSION_STATUS.PLAYING;
    }
    return await this.sessionRepository.save(session);
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
