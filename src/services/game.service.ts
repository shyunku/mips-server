import { Game } from '@/entity/game.entity';
import { SESSION_STATUS, Session } from '@/entity/session.entity';
import { User } from '@/entity/user.entity';
import { generateNumCode } from '@/utils/common.util';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game) private readonly gameRepository: Repository<Game>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async findAll(): Promise<Game[]> {
    return await this.gameRepository.find();
  }

  async getEndedSessionCount(): Promise<number> {
    return await this.sessionRepository.count({
      where: { status: SESSION_STATUS.ENDED },
    });
  }
}
