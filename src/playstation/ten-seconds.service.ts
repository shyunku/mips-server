import { User } from '@/user/user.entity';
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { UserSocket } from '@/socket/socket.middleware';
import { sessionRoom } from '@/socket/socket.dto';
import { SocketService } from '@/socket/socket.service';
import {
  PlayStationService,
  StationData,
  StationMemberStatus,
  StationTopics,
} from './station.interface';
import { SessionService } from '@/session/session.service';
import { clear } from 'console';
import { UserService } from '@/user/user.service';

const GAME_NAME = 'ten-seconds';

export const TOPICS = {
  STOP_COUNTER: `${GAME_NAME}/stop-counter`,
  INITIALIZE: `${GAME_NAME}/initialize`,
};

class MemberStatus extends StationMemberStatus {
  public uid: number;
  public counterStopAt: number | null;

  public initialize(): void {
    this.counterStopAt = null;
  }
}

class SessionData extends StationData<MemberStatus> {
  public counterThread: NodeJS.Timeout | null = null;

  public initialize(): void {
    clearTimeout(this.counterThread);
  }
}

class CounterEndedResultDto {
  public uid: number;
  public nickname: string | null;
  public stopAt: number | null;
  public rating: number | null;
}

class CounterEndedDto {
  public sessionId: number;
  public results: CounterEndedResultDto[];

  constructor(sessionId: number, results: CounterEndedResultDto[]) {
    this.sessionId = sessionId;
    this.results = results;
  }
}

const STOP_SECONDS_THRESHOLD = 15;
const BURST_SECONDS_THRESHOLD = 10;

@Injectable()
export class TenSecondsService extends PlayStationService<
  SessionData,
  MemberStatus
> {
  newStationMemberStatus(uid: number, nickname: string) {
    return new MemberStatus(uid, nickname);
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
      case TOPICS.STOP_COUNTER:
        this.stopIndividualCounter(sessionId, uid, payload);
        break;
      default:
        this.logger.warn(`Unknown topic: ${topic}`);
        break;
    }
  }

  public async handleSessionStart(sessionData: SessionData): Promise<void> {}

  public async handleSessionEnd(sessionData: SessionData): Promise<void> {}

  handleRoundStart(sessionData: SessionData, uid: number): void {
    const thread = setTimeout(() => {
      const participantStatusMap = sessionData.participantStatusMap;
      for (const participantStatus of participantStatusMap.values()) {
        if (participantStatus.counterStopAt == null) {
          // participantStatus.counterStopAt = STOP_SECONDS_THRESHOLD;
        }
      }
      this._handleRoundEnd(sessionData.id);
    }, STOP_SECONDS_THRESHOLD * 1000);
    sessionData.counterThread = thread;
  }

  async handleRoundEnd(sessionData: SessionData): Promise<void> {
    // sort by counter stop time
    const sortedParticipants = Array.from(
      sessionData.participantStatusMap.values(),
    )
      .filter(
        (e) =>
          e.counterStopAt !== null &&
          e.counterStopAt <= BURST_SECONDS_THRESHOLD,
      )
      .sort((a, b) => {
        return b.counterStopAt - a.counterStopAt;
      });

    const results: CounterEndedResultDto[] = [];
    for (const participantStatus of sessionData.participantStatusMap.values()) {
      const user = await this.userService.getUser(participantStatus.uid);

      const result = new CounterEndedResultDto();
      result.uid = participantStatus.uid;
      result.nickname = user.nickname;
      result.stopAt = participantStatus.counterStopAt;
      const index = sortedParticipants.findIndex(
        (status) => status.uid === participantStatus.uid,
      );
      if (index !== -1) {
        result.rating =
          sortedParticipants.findIndex(
            (status) => status.uid === participantStatus.uid,
          ) + 1;
      }
      results.push(result);
    }

    const resultDto = new CounterEndedDto(sessionData.id, results);

    this.socketService.broadcastToSession(
      sessionData.id,
      StationTopics.ROUND_ENDED,
      resultDto,
    );
  }

  async getCurrentSessionData(
    sessionData: SessionData,
    uid: number,
  ): Promise<any | null> {
    // TODO :: implement
  }

  /* ------------------------ custom ------------------------ */

  stopIndividualCounter(
    sessionId: number,
    uid: number,
    stopSeconds: number,
  ): void {
    this.logger.debug(`Individual counter stopped: ${uid} ${stopSeconds}`);
    const sessionData = this.sessionDataMap.get(sessionId);
    if (!sessionData) return;
    const participantStatus = sessionData.participantStatusMap.get(uid);
    if (!participantStatus) return;
    if (participantStatus.counterStopAt != null) return;
    if (stopSeconds == null) return;
    participantStatus.counterStopAt = stopSeconds;

    const undoneParticipants = Array.from(
      sessionData.participantStatusMap.values(),
    ).filter((status) => status.counterStopAt == null);
    if (undoneParticipants.length === 0) {
      // all participants have stopped
      clearTimeout(sessionData.counterThread);
      this._handleRoundEnd(sessionId);
      this.logger.debug(`Session ${sessionId} automatically ended`);
    }

    this.refreshUpdateTime(sessionId);
  }
}
