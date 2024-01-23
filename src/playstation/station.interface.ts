export interface PlayStationService {
  startSession(sessionId: number): void;
  endSession(sessionId: number): void;

  routeMessage(
    sessionId: number,
    senderUid: number,
    isCreator: boolean,
    topic: string,
    payload: any,
  ): void;
  canDestroy(sessionId: number): boolean;
}
