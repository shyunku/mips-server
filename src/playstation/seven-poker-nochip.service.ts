import { Injectable, Logger } from '@nestjs/common';
import {
  PlayStationService,
  StationData,
  StationMemberStatus,
} from './station.interface';

const GameName = 'seven-poker-nochip';

export const Topics = {};

export const Stage = {
  READY: 'ready',
  BET: 'bet',
};

class MemberStatus extends StationMemberStatus {
  public gold: string;
  public bet: string;

  public initialize(): void {
    this.gold = '0';
    this.bet = '0';
  }
}

class SessionData extends StationData<MemberStatus> {
  public pot: string;
  public waitingFor: number;

  public initialize(): void {
    this.pot = '0';
  }
}

@Injectable()
export class SevenPokerNoChipService extends PlayStationService<
  SessionData,
  MemberStatus
> {
  protected logger: Logger = new Logger('SevenPokerNoChipService');

  newStationMemberStatus(uid: number, nickname: string) {
    return new MemberStatus(uid, nickname);
  }
  newSessionData(sessionId: number) {
    return new SessionData(sessionId);
  }

  public initialize(sessionData: SessionData): void {}
  public routeMessage(
    sessionData: SessionData,
    senderUid: number,
    isCreator: boolean,
    topic: string,
    payload: any,
  ): void {
    switch (topic) {
      default:
        this.logger.warn(`Unknown topic: ${topic}`);
        break;
    }
  }
  public handleSessionStart(sessionData: SessionData): void {}
  public handleSessionEnd(sessionData: SessionData): void {}
  public handleRoundStart(sessionData: SessionData, uid: number): void {}
  public handleRoundEnd(sessionData: SessionData): void {}
  public getCurrentSessionData(sessionData: SessionData, uid: number) {}
}
