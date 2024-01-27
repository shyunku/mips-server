import { User } from '@/user/user.entity';
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { UserSocket } from '@/socket/socket.middleware';
import { sessionRoom } from '@/socket/socket.dto';
import { SocketService } from '@/socket/socket.service';
import {
  PlayStationService,
  StationData,
  StationMemberStatus,
} from './station.interface';
import { SessionService } from '@/session/session.service';
import { clear } from 'console';
import { UserService } from '@/user/user.service';

const GAME_NAME = 'mafia';

export const TOPICS = {
  INITIALIZE: `${GAME_NAME}/initialize`,
};

type Job = 'citizen' | 'mafia' | 'police' | 'doctor';

class MemberStatus extends StationMemberStatus {
  public uid: number;
  public job: Job | null;

  public initialize(): void {
    this.job = null;
  }
}

class SessionData extends StationData<MemberStatus> {
  public initialize(): void {}
}

@Injectable()
export class MafiaService extends PlayStationService<
  SessionData,
  MemberStatus
> {
  newStationMemberStatus(uid: number) {
    return new MemberStatus(uid);
  }
  newSessionData(sessionId: number) {
    return new SessionData(sessionId);
  }

  routeMessage(
    sessionId: number,
    uid: number,
    isCreator: boolean,
    topic: string,
    payload: any,
  ): void {
    switch (topic) {
      case TOPICS.INITIALIZE:
        this.initialize(sessionId);
        break;
      default:
        this.logger.warn(`Unknown topic: ${topic}`);
        break;
    }
  }

  handleRoundStart(sessionData: SessionData, uid: number): void {}

  async handleRoundEnd(sessionData: SessionData): Promise<void> {}
}
