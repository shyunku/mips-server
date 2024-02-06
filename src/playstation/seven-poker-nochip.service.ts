import { Injectable, Logger } from '@nestjs/common';
import {
  PlayStationService,
  StationData,
  StationMemberStatus,
} from './station.interface';
import BigNumber from 'bignumber.js';

const GameName = 'seven-poker-nochip';

const Topics = {
  INITIAL_SETTING: `${GameName}/initial-setting`,
  START: `${GameName}/start`,
  BET: `${GameName}/bet`,
  WIN: `${GameName}/win`,
  STATE_CHANGE: `${GameName}/state-change`,
  GIVE_MONEY_TO_ALL: `${GameName}/give-money-to-all`,
  GIVE_MONEY_TO: `${GameName}/give-money-to`,
  GAME_END: `${GameName}/game-end`,
};

const Stage = {
  INITIAL: 'initial',
  READY: 'ready',
  BET: 'bet',
};

const BetProcessType = {
  NORMAL: 'normal',
  CALL: 'call',
};
type BetProcessType = (typeof BetProcessType)[keyof typeof BetProcessType];

const BetType = {
  CALL: 'call',
  CHECK: 'check',
  HALF: 'half',
  BBING: 'bbing',
  DDADANG: 'ddadang',
  DIE: 'die',
};
type BetType = (typeof BetType)[keyof typeof BetType];

export const UpperBound = BigNumber('100000000000000000000');

class MemberStatus extends StationMemberStatus {
  public gold: BigNumber;
  public bet: BigNumber;
  public died: boolean;
  public betType: BetType | null;

  public initialize(): void {
    this.gold = BigNumber(0);
    this.bet = BigNumber(0);
    this.died = false;
  }
}

class SessionData extends StationData<MemberStatus> {
  public pot: BigNumber;
  public currentBet: BigNumber;
  public startBetGold: BigNumber;
  public waitingFor: number | null;
  public stage: string;
  public round: number;
  public turnOrder: Set<number>;
  public currentTurn: number | null;
  public currentBetType: BetProcessType | null;
  public settingComplete: boolean;
  public reachedAllIn: boolean;

  public initialize(): void {
    this.pot = BigNumber(0);
    this.currentBet = BigNumber(0);
    this.startBetGold = BigNumber(0);
    this.waitingFor = null;
    this.stage = Stage.INITIAL;
    this.round = 0;
    this.turnOrder = new Set<number>();
    this.currentTurn = null;
    this.currentBetType = null;
    this.settingComplete = false;
    this.reachedAllIn = false;
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

  public initialize(sessionData: SessionData): void {
    sessionData.stage = Stage.INITIAL;
  }
  public routeMessage(
    sessionData: SessionData,
    senderUid: number,
    isCreator: boolean,
    topic: string,
    payload: any,
  ): void {
    switch (topic) {
      case Topics.INITIAL_SETTING:
        this.setOrderAndStart(sessionData, isCreator, payload);
        break;
      case Topics.BET:
        this.bet(sessionData, senderUid, payload);
        break;
      case Topics.WIN:
        this.win(sessionData, isCreator, payload);
        break;
      case Topics.GIVE_MONEY_TO_ALL:
        this.giveMoneyToAll(sessionData, isCreator, payload);
        break;
      case Topics.GIVE_MONEY_TO:
        this.giveMoneyTo(sessionData, isCreator, payload);
        break;
      default:
        this.logger.warn(`Unknown topic: ${topic}`);
        break;
    }
  }
  public handleSessionStart(sessionData: SessionData): void {}
  public handleSessionEnd(sessionData: SessionData): void {}
  public handleRoundStart(sessionData: SessionData, uid: number): void {
    sessionData.stage = Stage.BET;
    sessionData.currentTurn = Array.from(sessionData.turnOrder)[0];

    let collected = BigNumber(0);
    for (const [uid, memberStatus] of sessionData.members) {
      const collecting = sessionData.startBetGold;
      memberStatus.gold = memberStatus.gold.minus(collecting);
      collected = collected.plus(collecting);
    }
    sessionData.pot = sessionData.pot.plus(collected);
    sessionData.currentBetType = BetProcessType.NORMAL;

    this.socketService.broadcastToSession(sessionData.id, Topics.START, {
      pot: sessionData.pot,
      round: sessionData.round,
      currentTurn: sessionData.currentTurn,
    });
    this.socketService.broadcastToSession(sessionData.id, Topics.STATE_CHANGE);
  }
  public handleRoundEnd(sessionData: SessionData): void {
    sessionData.stage = Stage.READY;
    sessionData.pot = BigNumber(0);
    sessionData.currentBet = BigNumber(0);
  }
  public getCurrentSessionData(sessionData: SessionData, uid: number) {
    return {
      ...sessionData,
      members: Array.from(sessionData.members.values()),
      turnOrder: Array.from(sessionData.turnOrder),
    };
  }

  /* ------------------------ custom ------------------------ */
  public async bet(sessionData: SessionData, uid: number, betType: BetType) {
    if (sessionData.stage !== Stage.BET) {
      this.logger.warn(`Invalid stage`);
      return;
    }
    if (sessionData.currentTurn !== uid) {
      this.logger.warn(
        `Not your turn: ${uid}, current: ${sessionData.currentTurn}`,
      );
      return;
    }

    const memberStatus = sessionData.members.get(uid);
    if (!memberStatus) {
      this.logger.warn(`User not found: ${uid}`);
      return;
    }

    let died = false;
    if (betType === BetType.DIE) {
      memberStatus.died = true;
      died = true;
    }
    if (betType === BetType.BBING && !sessionData.currentBet.isEqualTo(0)) {
      this.logger.warn(
        `Invalid bet type: ${betType}, you can only bbing when current bet is 0`,
      );
      return;
    }

    let betAmount = BigNumber(0);
    if (!died) {
      if (sessionData.currentBetType === BetProcessType.NORMAL) {
        switch (betType) {
          case BetType.CALL:
            betAmount = BigNumber(sessionData.currentBet);
            break;
          case BetType.CHECK:
            betAmount = BigNumber(0);
            break;
          case BetType.HALF:
            betAmount = sessionData.pot.dividedBy(2);
            break;
          case BetType.BBING:
            betAmount = sessionData.startBetGold;
            break;
          case BetType.DDADANG:
            betAmount = sessionData.currentBet.times(2);
            break;
          default:
            this.logger.warn(`Invalid bet type: ${betType}`);
            break;
        }
      } else if (sessionData.currentBetType === BetProcessType.CALL) {
        switch (betType) {
          case BetType.CALL:
            betAmount = sessionData.currentBet.minus(memberStatus.bet);
            break;
          default:
            this.logger.warn(`Invalid bet type: ${betType}, you can only call`);
            return;
        }
      }
    }

    if (betAmount.isGreaterThan(memberStatus.gold)) {
      betAmount = BigNumber(memberStatus.gold);
      sessionData.reachedAllIn = true;
    }
    memberStatus.gold = memberStatus.gold.minus(betAmount);
    memberStatus.bet = memberStatus.bet.plus(betAmount);
    memberStatus.betType = betType;
    sessionData.currentBet = memberStatus.bet.gt(sessionData.currentBet)
      ? BigNumber(memberStatus.bet)
      : sessionData.currentBet;
    sessionData.pot = sessionData.pot.plus(betAmount);

    const nextTurnUid =
      sessionData.currentBetType === BetProcessType.CALL
        ? this.getNextUncalledTurn(sessionData, false)
        : this.getNextTurn(sessionData, false);
    if (nextTurnUid === null) {
      // check for call needed
      let callNeeded = false;
      sessionData.members.forEach((memberStatus) => {
        if (
          !memberStatus.died &&
          memberStatus.bet.isLessThan(sessionData.currentBet)
        ) {
          callNeeded = true;
        }
      });
      if (sessionData.currentBetType === BetProcessType.NORMAL && callNeeded) {
        sessionData.currentBetType = BetProcessType.CALL;
        sessionData.currentTurn = this.getNextUncalledTurn(sessionData, true);
      } else {
        sessionData.round++;
        sessionData.stage = Stage.BET;
        sessionData.currentBet = BigNumber(0);
        sessionData.currentBetType = BetProcessType.NORMAL;
        sessionData.members.forEach((memberStatus) => {
          memberStatus.bet = BigNumber(0);
          memberStatus.betType = null;
        });
        sessionData.currentTurn = this.getFirstTurn(sessionData);
      }
    } else {
      sessionData.currentTurn = nextTurnUid;
    }

    const end = this.checkForGameEnd(sessionData);
    this.socketService.broadcastToSession(
      sessionData.id,
      Topics.STATE_CHANGE,
      this.getCurrentSessionData(sessionData, uid),
    );
  }

  private async win(sessionData: SessionData, isCreator: boolean, uid: any) {
    const winner = sessionData.members.get(uid);
    if (!winner) {
      this.logger.warn(`Winner not found`);
      return;
    }

    winner.gold = winner.gold.plus(sessionData.pot);
    sessionData.pot = BigNumber(0);
    sessionData.currentBet = BigNumber(0);

    this.socketService.broadcastToSession(sessionData.id, Topics.WIN, {
      uid: winner.uid,
      nickname: winner.nickname,
      earned: sessionData.pot,
    });

    this._handleRoundEnd(sessionData.id);
  }

  public async giveMoneyToAll(
    sessionData: SessionData,
    isCreator: boolean,
    amount: string,
  ) {
    if (!isCreator) {
      this.logger.warn(`User is not creator`);
      return;
    }

    const amountBN = BigNumber(amount);
    if (amountBN.isNaN() || amountBN.isNegative()) {
      this.logger.warn(`Invalid amount: ${amount}`);
      return;
    }
    if (amountBN.isGreaterThan(UpperBound)) {
      this.logger.warn(`Amount too large: ${amount}`);
      return;
    }

    for (const [uid, memberStatus] of sessionData.members) {
      memberStatus.gold = memberStatus.gold.plus(amountBN);
    }

    this.socketService.broadcastToSession(
      sessionData.id,
      Topics.GIVE_MONEY_TO_ALL,
      amount,
    );
  }

  public async giveMoneyTo(
    sessionData: SessionData,
    isCreator: boolean,
    payload: any,
  ) {
    if (!isCreator) {
      this.logger.warn(`User is not creator`);
      return;
    }

    const { uidList, amount } = payload;

    // check uid validity
    let validUids = 0;
    for (const uid of uidList) {
      if (sessionData.members.has(uid)) {
        validUids++;
      }
    }

    if (validUids !== uidList.length) {
      this.logger.warn(`Invalid uid`);
      return;
    }

    if (validUids === sessionData.members.size) {
      this.giveMoneyToAll(sessionData, isCreator, amount);
      return;
    }

    for (const uid of uidList) {
      const memberStatus = sessionData.members.get(uid);
      if (!memberStatus) {
        this.logger.warn(`User not found: ${uid}`);
        continue;
      }

      const amountBN = BigNumber(amount);
      if (amountBN.isNaN() || amountBN.isNegative()) {
        this.logger.warn(`Invalid amount: ${amount}`);
        return;
      }
      if (amountBN.isGreaterThan(UpperBound)) {
        this.logger.warn(`Amount too large: ${amount}`);
        return;
      }

      memberStatus.gold = memberStatus.gold.plus(amountBN);
    }

    this.socketService.broadcastToSession(
      sessionData.id,
      Topics.GIVE_MONEY_TO,
      {
        uidList,
        amount,
      },
    );
  }

  public async initializeMoney(
    sessionData: SessionData,
    isCreator: boolean,
    amount: string,
  ) {
    if (!isCreator) {
      this.logger.warn(`User is not creator`);
      return;
    }

    for (const [uid, memberStatus] of sessionData.members) {
      memberStatus.gold = BigNumber(amount);
    }
  }

  public async setOrderAndStart(
    sessionData: SessionData,
    isCreator: boolean,
    payload: any,
  ) {
    if (sessionData.stage !== Stage.INITIAL) {
      this.logger.warn(`Game already started`);
      return;
    }

    if (!isCreator) {
      this.logger.warn(`User is not creator`);
      return;
    }

    const { order, initialGold, startBetGold } = payload;

    // validate order
    if (order.length !== sessionData.members.size) {
      this.logger.warn(`Invalid order length`);
      return;
    }

    for (const uid of order) {
      if (!sessionData.members.has(uid)) {
        this.logger.warn(`Invalid order`);
        return;
      }

      const memberStatus = sessionData.members.get(uid);
      if (!memberStatus) {
        this.logger.warn(`Member status not found`);
        return;
      }

      memberStatus.gold = BigNumber(initialGold);
    }

    sessionData.turnOrder = new Set(order);
    sessionData.currentTurn = null;
    sessionData.startBetGold = BigNumber(startBetGold);
    sessionData.stage = Stage.READY;
    sessionData.settingComplete = true;

    this.socketService.broadcastToSession(
      sessionData.id,
      Topics.INITIAL_SETTING,
      {
        order,
        initialGold,
        startBetGold,
        members: Array.from(sessionData.members.values()),
      },
    );
  }

  private getFirstTurn(sessionData: SessionData): number | null {
    const order = Array.from(sessionData.turnOrder);
    for (let i = 0; i < order.length; i++) {
      const uid = order[i];
      const user = sessionData.members.get(uid);
      if (!user.died) {
        return uid;
      }
    }
    return null;
  }

  private getNextTurn(
    sessionData: SessionData,
    allowCycle: boolean,
  ): number | null {
    const order = Array.from(sessionData.turnOrder);
    const currentIndex = order.indexOf(sessionData.currentTurn);
    if (currentIndex === -1) {
      this.logger.warn(`Invalid current turn: ${sessionData.currentTurn}`);
      return null;
    }

    let nextIndex = null;
    for (let i = currentIndex + 1; i < order.length; i++) {
      const uid = order[i];
      const user = sessionData.members.get(uid);
      if (!user.died) {
        nextIndex = i;
        break;
      }
    }

    if (nextIndex !== null) {
      return order[nextIndex];
    }

    if (allowCycle) {
      for (let i = 0; i <= currentIndex; i++) {
        const uid = order[i];
        const user = sessionData.members.get(uid);
        if (!user.died) {
          nextIndex = i;
          break;
        }
      }
    }

    return nextIndex !== null ? order[nextIndex] : null;
  }

  private getNextUncalledTurn(
    sessionData: SessionData,
    allowCycle: boolean,
  ): number | null {
    const order = Array.from(sessionData.turnOrder);
    const currentIndex = order.indexOf(sessionData.currentTurn);
    if (currentIndex === -1) {
      this.logger.warn(`Invalid current turn: ${sessionData.currentTurn}`);
      return null;
    }

    let nextIndex = null;
    for (let i = currentIndex + 1; i < order.length; i++) {
      const uid = order[i];
      const user = sessionData.members.get(uid);
      if (!user.died && user.bet.isLessThan(sessionData.currentBet)) {
        nextIndex = i;
        break;
      }
    }

    if (nextIndex !== null) {
      return order[nextIndex];
    }

    if (allowCycle) {
      for (let i = 0; i <= currentIndex; i++) {
        const uid = order[i];
        const user = sessionData.members.get(uid);
        if (!user.died && user.bet.isLessThan(sessionData.currentBet)) {
          nextIndex = i;
          break;
        }
      }
    }

    return nextIndex !== null ? order[nextIndex] : null;
  }

  private checkForGameEnd(sessionData: SessionData): boolean {
    let aliveCount = 0;
    for (const [uid, memberStatus] of sessionData.members) {
      if (!memberStatus.died) {
        aliveCount++;
      }
    }

    const end = aliveCount <= 1;
    if (end) {
      // pot to winner
      if (aliveCount === 1) {
        const winner = Array.from(sessionData.members.values()).find(
          (m) => !m.died,
        );
        if (winner) {
          winner.gold = winner.gold.plus(sessionData.pot);
          console.log(winner.gold, sessionData.pot);

          this.socketService.broadcastToSession(sessionData.id, Topics.WIN, {
            uid: winner.uid,
            nickname: winner.nickname,
            earned: sessionData.pot,
          });

          sessionData.pot = BigNumber(0);
          sessionData.currentBet = BigNumber(0);
        }
      }
      this._handleRoundEnd(sessionData.id);
    }

    return end;
  }
}
