import { User } from '@/user/user.entity';
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { UserSocket } from '@/socket/socket.middleware';
import { sessionRoom } from '@/socket/socket.dto';
import { SocketService } from '@/socket/socket.service';
import { PlayStationService } from './station.interface';
import { SessionService } from '@/session/session.service';
import { clear } from 'console';
import { UserService } from '@/user/user.service';

export const TOPICS = {
  START_COUNTER: 'ten-seconds/start-counter',
  STOP_COUNTER: 'ten-seconds/stop-counter',
  COUNTER_ENDED: 'ten-seconds/counter-ended',
  INITIALIZE: 'ten-seconds/initialize',
};

class ParticipantStatus {
  public uid: number;
  public counterStopAt: number | null;
}

class SessionData {
  public participantStatusMap = new Map<number, ParticipantStatus>();
  public started: boolean = false;
  public ended: boolean = false;
  public counterThread: NodeJS.Timeout | null = null;
  public lastUpdatedAt: number = Date.now();
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
export class TenSecondsService implements PlayStationService {
  private logger: Logger = new Logger('TenSecondsService');
  private sessionDataMap = new Map<number, SessionData>();

  constructor(
    private socketService: SocketService,
    @Inject(forwardRef(() => SessionService))
    private sessionService: SessionService,
    private userService: UserService,
  ) {}

  async startSession(sessionId: number) {
    // create session initial data
    const session = await this.sessionService.getSession(sessionId);
    if (!session) return;
    const sessionData = new SessionData();
    sessionData.participantStatusMap = new Map<number, ParticipantStatus>();
    for (const participant of session.participants) {
      const participantStatus = new ParticipantStatus();
      participantStatus.uid = participant.uid;
      participantStatus.counterStopAt = null;
      sessionData.participantStatusMap.set(participant.uid, participantStatus);
    }
    this.sessionDataMap.set(sessionId, sessionData);
    this.logger.debug(`Session ${sessionId} started`);
  }

  endSession(sessionId: number): void {
    this.sessionDataMap.delete(sessionId);
    this.logger.debug(`Session ${sessionId} ended`);
  }

  refreshUpdateTime(sessionId: number): void {
    const sessionData = this.sessionDataMap.get(sessionId);
    if (!sessionData) return;
    sessionData.lastUpdatedAt = Date.now();
  }

  routeMessage(
    sessionId: number,
    uid: number,
    isCreator: boolean,
    topic: string,
    payload: any,
  ): void {
    switch (topic) {
      case TOPICS.START_COUNTER:
        if (!isCreator) return;
        this.startCounter(sessionId, uid);
        break;
      case TOPICS.STOP_COUNTER:
        this.stopIndividualCounter(sessionId, uid, payload);
        break;
      case TOPICS.INITIALIZE:
        this.initialize(sessionId);
        break;
      default:
        this.logger.warn(`Unknown topic: ${topic}`);
        break;
    }
  }

  canDestroy(sessionId: number): boolean {
    if (this.sessionDataMap.has(sessionId)) {
      const sessionData = this.sessionDataMap.get(sessionId);
      if (!sessionData) return true;
      const elapsedAfterLastUpdate = Date.now() - sessionData.lastUpdatedAt;
      const day = 24 * 60 * 60 * 1000;
      return elapsedAfterLastUpdate > day && sessionData.ended;
    }
  }

  startCounter(sessionId: number, uid: number): void {
    const sessionData = this.sessionDataMap.get(sessionId);
    if (!sessionData) {
      this.logger.debug(`Session ${sessionId} not found`);
      console.log(
        sessionData,
        sessionId,
        this.sessionDataMap,
        typeof sessionId,
      );
      return;
    }
    const participantStatus = sessionData.participantStatusMap.get(uid);
    if (!participantStatus) return;

    if (sessionData.started) {
      // already started
      this.logger.debug(`Session ${sessionId} already started`);
      return;
    }

    sessionData.started = true;

    const thread = setTimeout(() => {
      const sessionData = this.sessionDataMap.get(sessionId);
      if (!sessionData) return;
      const participantStatusMap = sessionData.participantStatusMap;
      for (const participantStatus of participantStatusMap.values()) {
        if (participantStatus.counterStopAt == null) {
          // participantStatus.counterStopAt = STOP_SECONDS_THRESHOLD;
        }
      }
      this.handleGameEnd(sessionId);
    }, STOP_SECONDS_THRESHOLD * 1000);
    sessionData.counterThread = thread;

    // broadcast to all
    this.socketService.broadcastToSession(
      sessionId,
      TOPICS.START_COUNTER,
      sessionId,
    );
  }

  stopIndividualCounter(
    sessionId: number,
    uid: number,
    stopSeconds: number,
  ): void {
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
      this.handleGameEnd(sessionId);
    }
  }

  async handleGameEnd(sessionId: number): Promise<void> {
    this.logger.debug(`handle game end: ${sessionId}`);
    const sessionData = this.sessionDataMap.get(sessionId);
    if (!sessionData) return;
    sessionData.ended = true;

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

    const resultDto = new CounterEndedDto(sessionId, results);

    const sockets = this.socketService.getSessionClients(sessionId);
    for (const socket of sockets) {
      const uid = socket.user.uid;
      if (!uid) {
        continue;
      }
      const rating = sortedParticipants.findIndex(
        (status) => status.uid === uid,
      );
      const status = sessionData.participantStatusMap.get(uid);
      if (!status) {
        continue;
      }
      const stopAt = status.counterStopAt;
      const isBurst = stopAt == null || stopAt > BURST_SECONDS_THRESHOLD;

      socket.emit(TOPICS.COUNTER_ENDED, resultDto);
    }
  }

  initialize(sessionId: number): void {
    const sessionData = this.sessionDataMap.get(sessionId);
    if (!sessionData) {
      this.startSession(sessionId);
      this.socketService.broadcastToSession(
        sessionId,
        TOPICS.INITIALIZE,
        sessionId,
      );
      return;
    }
    sessionData.started = false;
    sessionData.ended = false;
    clearTimeout(sessionData.counterThread);
    for (const participantStatus of sessionData.participantStatusMap.values()) {
      participantStatus.counterStopAt = null;
    }

    this.socketService.broadcastToSession(
      sessionId,
      TOPICS.INITIALIZE,
      sessionId,
    );
  }
}
