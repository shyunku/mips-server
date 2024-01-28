import { SessionService } from '@/session/session.service';
import { SOCKET_TOPICS } from '@/socket/socket.dto';
import { SocketService } from '@/socket/socket.service';
import { UserService } from '@/user/user.service';
import { Inject, Logger, forwardRef } from '@nestjs/common';

export const StationTopics = {
  ROUND_INITIALIZE: 'round/initialize',
  ROUND_START: 'round/start',
  ROUND_ENDED: 'round/ended',
  ROUND_STATUS: 'round/status',
};

export abstract class StationMemberStatus {
  public uid: number;
  public nickname: string | null = null;

  constructor(uid: number, nickname: string) {
    this.uid = uid;
    this.nickname = nickname;
    this.initialize();
  }

  public abstract initialize(): void;
}

export abstract class StationData<T extends StationMemberStatus> {
  public id: number;
  public participantStatusMap = new Map<number, T>();
  public started: boolean = false;
  public ended: boolean = false;
  public lastUpdatedAt: number = Date.now();
  public creatorUid: number | null = null;

  constructor(id: number) {
    this.id = id;
  }

  public _initialize(): void {
    this.started = false;
    this.ended = false;
    this.lastUpdatedAt = Date.now();
    for (const status of this.participantStatusMap.values()) {
      status.initialize();
    }
    this.initialize();
  }

  public abstract initialize(): void;
}

export abstract class PlayStationService<
  T extends StationData<K>,
  K extends StationMemberStatus,
> {
  protected logger: Logger = new Logger('PlayStationService');
  public sessionDataMap = new Map<number, T>();

  constructor(
    protected socketService: SocketService,
    @Inject(forwardRef(() => SessionService))
    protected sessionService: SessionService,
    protected userService: UserService,
  ) {}

  public abstract newStationMemberStatus(uid: number, nickname: string): K;
  public abstract newSessionData(sessionId: number): T;

  // public abstract initialize(sessionData: T): void;
  protected async initialize(sessionId: number): Promise<void> {
    const sessionData = this.sessionDataMap.get(sessionId);
    if (!sessionData) return;

    sessionData.started = false;
    sessionData.ended = false;

    sessionData._initialize();
    this.logger.debug(`Session ${sessionId} initialized`);

    this.socketService.broadcastToSession(
      sessionId,
      StationTopics.ROUND_INITIALIZE,
      sessionId,
    );
  }

  public abstract routeMessage(
    sessionId: number,
    senderUid: number,
    isCreator: boolean,
    topic: string,
    payload: any,
  ): void;
  public _routeMessage(
    sessionId: number,
    senderUid: number,
    isCreator: boolean,
    topic: string,
    payload: any,
  ): void {
    switch (topic) {
      case StationTopics.ROUND_INITIALIZE:
        this.initialize(sessionId);
        break;
      case StationTopics.ROUND_START:
        this._handleRoundStart(sessionId, senderUid);
        break;
      case StationTopics.ROUND_ENDED:
        this._handleRoundEnd(sessionId);
        break;
      case StationTopics.ROUND_STATUS:
        this.handleRoundStatus(sessionId, senderUid);
        break;
      default:
        this.routeMessage(sessionId, senderUid, isCreator, topic, payload);
        break;
    }
  }

  // define session start handler
  public abstract handleSessionStart(sessionData: T): void;
  public async _handleSessionStart(sessionId: number): Promise<void> {
    this.logger.debug(`Session ${sessionId} started`);
    // create session initial data
    const session = await this.sessionService.getSession(sessionId);
    if (!session) return;

    const sessionData = this.newSessionData(sessionId);
    sessionData.participantStatusMap.clear();
    for (const participant of session.participants) {
      const user = await this.userService.getUser(participant.uid);
      if (!user) {
        this.logger.debug(`User ${participant.uid} not found`);
        continue;
      }
      const status = this.newStationMemberStatus(
        participant.uid,
        user.nickname,
      );
      status.initialize();
      sessionData.participantStatusMap.set(participant.uid, status);
    }
    sessionData.creatorUid = session.creator.uid;
    this.sessionDataMap.set(sessionId, sessionData);
    this.logger.debug(`Session ${sessionId} started`);

    this.handleSessionStart(sessionData);
  }

  // define session end handler
  public abstract handleSessionEnd(sessionData: T): void;
  public _handleSessionEnd(sessionId: number): void {
    const sessionData = this.sessionDataMap.get(sessionId);
    if (!sessionData) return;

    this.handleSessionEnd(sessionData);

    this.sessionDataMap.delete(sessionId);
    this.logger.debug(`Session ${sessionId} ended`);
  }

  public abstract handleRoundStart(sessionData: T, uid: number): void;
  public _handleRoundStart(sessionId: number, uid: number): void {
    this.logger.debug(`Session ${sessionId} round started`);
    const sessionData = this.sessionDataMap.get(sessionId);
    if (!sessionData) {
      this.logger.debug(`Session ${sessionId} not found`);
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

    this.handleRoundStart(sessionData, uid);

    // broadcast to all
    this.socketService.broadcastToSession(
      sessionId,
      StationTopics.ROUND_START,
      sessionId,
    );

    this.refreshUpdateTime(sessionId);
  }

  public abstract handleRoundEnd(sessionData: T): void;
  public _handleRoundEnd(sessionId: number): void {
    this.logger.debug(`Session round ${sessionId} ended`);
    const sessionData = this.sessionDataMap.get(sessionId);
    if (!sessionData) {
      this.logger.debug(`Session ${sessionId} not found`);
      return;
    }
    sessionData.ended = true;
    this.socketService.broadcastToSession(
      sessionId,
      StationTopics.ROUND_ENDED,
      sessionId,
    );

    this.handleRoundEnd(sessionData);

    this.refreshUpdateTime(sessionData.id);
  }

  public async handleRoundStatus(
    sessionId: number,
    uid: number,
  ): Promise<void> {
    const sessionData = this.sessionDataMap.get(sessionId);
    if (!sessionData) return;

    // check if user is participant
    if (!sessionData.participantStatusMap.has(uid)) return;

    const currentData = await this.getCurrentSessionData(sessionData, uid);
    this.socketService.unicastToSession(
      uid,
      sessionId,
      StationTopics.ROUND_STATUS,
      currentData,
    );
  }

  public abstract getCurrentSessionData(
    sessionData: T,
    uid: number,
  ): any | null;

  public canDestroy(sessionId: number): boolean {
    if (this.sessionDataMap.has(sessionId)) {
      const sessionData = this.sessionDataMap.get(sessionId);
      if (!sessionData) return true;
      const elapsedAfterLastUpdate = Date.now() - sessionData.lastUpdatedAt;
      const day = 24 * 60 * 60 * 1000;
      return elapsedAfterLastUpdate > day && sessionData.ended;
    }
  }

  protected refreshUpdateTime(sessionId: number): void {
    const sessionData = this.sessionDataMap.get(sessionId);
    if (!sessionData) return;
    sessionData.lastUpdatedAt = Date.now();
  }

  protected getSessionData(sessionId: number): T | null {
    return this.sessionDataMap.get(sessionId) ?? null;
  }

  protected isCreator(sessionId: number, uid: number): boolean {
    const sessionData = this.sessionDataMap.get(sessionId);
    if (!sessionData) return false;
    return sessionData.creatorUid === uid;
  }
}
