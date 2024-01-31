import { Injectable, Logger } from '@nestjs/common';
import {
  PlayStationService,
  StationData,
  StationMemberStatus,
} from './station.interface';

const GameName = 'seven-poker-nochip';

export const Topics = {};

export const Stage = {};

class MemberStatus extends StationMemberStatus {
  public initialize(): void {}
}

class SessionData extends StationData<MemberStatus> {
  public initialize(): void {}
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

  public initialize(sessionData: SessionData): void {
    throw new Error('Method not implemented.');
  }
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
  public handleSessionStart(sessionData: SessionData): void {
    throw new Error('Method not implemented.');
  }
  public handleSessionEnd(sessionData: SessionData): void {
    throw new Error('Method not implemented.');
  }
  public handleRoundStart(sessionData: SessionData, uid: number): void {
    throw new Error('Method not implemented.');
  }
  public handleRoundEnd(sessionData: SessionData): void {
    throw new Error('Method not implemented.');
  }
  public getCurrentSessionData(sessionData: SessionData, uid: number) {
    throw new Error('Method not implemented.');
  }
}
