import { SocketGateway } from '@/socket/socket.gateway';
import { Game } from '@/game/game.entity';
import { GameSession, SESSION_STATUS } from '@/session/session.entity';
import { User } from '@/user/user.entity';
import { generateNumCode } from '@/utils/common.util';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { SocketService } from '@/socket/socket.service';
import { SOCKET_TOPICS, JoinSessionResult } from '@/socket/socket.dto';
import { SessionCreateDto } from './session.dto';

@Injectable()
export class SessionService {
  private logger: Logger = new Logger('SessionService');

  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    @InjectRepository(GameSession)
    private readonly sessionRepository: Repository<GameSession>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private socketService: SocketService,
    private readonly dataSource: DataSource,
  ) {}

  // TODO :: delete expired sessions (24 hours later of created but not started)

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

  async getActiveSessions(uid: number): Promise<GameSession[]> {
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
    const joinedSessions = user.joinedSessions;
    return joinedSessions.filter(
      (session) => session.status !== SESSION_STATUS.ENDED,
    );
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
    const tx = this.dataSource.createQueryRunner();
    await tx.connect();
    await tx.startTransaction();

    try {
      const user = await tx.manager.findOne(User, { where: { uid } });
      if (!user) {
        throw new HttpException(
          `can't find user with id ${uid}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      const session = await tx.manager.findOne(GameSession, {
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
        throw new HttpException(
          `password is incorrect`,
          HttpStatus.BAD_REQUEST,
        );
      }

      session.participants = [...session.participants, user];
      if (session.participants.length > session.game.maxMembers) {
        session.status = SESSION_STATUS.PLAYING;
      }

      const result = await tx.manager.save(session);
      await tx.commitTransaction();

      try {
        this.socketService.joinSession(uid, session.id);
        this.socketService.multicastToSession(
          uid,
          session.id,
          SOCKET_TOPICS.SESSION_JOIN,
          JoinSessionResult.fromUser(user),
        );
      } catch (err) {
        this.logger.error(err);
      }

      return result;
    } catch (err) {
      await tx.rollbackTransaction();
      throw err;
    } finally {
      await tx.release();
    }
  }

  async createSession(
    gameId: number,
    uid: number,
    password: string | null,
  ): Promise<SessionCreateDto> {
    const tx = this.dataSource.createQueryRunner();
    await tx.connect();
    await tx.startTransaction();

    try {
      const user = await tx.manager.findOne(User, { where: { uid } });
      if (!user) {
        throw new HttpException(
          `can't find user with id ${uid}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      const game = await tx.manager.findOne(Game, { where: { gid: gameId } });
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

      await tx.manager.save(session);
      await tx.commitTransaction();

      try {
        this.socketService.joinSession(uid, session.id);
      } catch (err) {
        this.logger.error(err);
      }
      return SessionCreateDto.fromSession(session);
    } catch (err) {
      await tx.rollbackTransaction();
      throw err;
    } finally {
      await tx.release();
    }
  }

  async deleteSession(id: number): Promise<void> {
    await this.sessionRepository.delete({ id });
  }
}
