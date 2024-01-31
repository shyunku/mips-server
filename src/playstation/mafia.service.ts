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
  NEED_JOB_SETTING: `${GAME_NAME}/need-job-setting`, // -> 방장
  JOB_SETTING: `${GAME_NAME}/job-setting`, // <- 방장
  JOB_CONFIRMING: `${GAME_NAME}/job-confirming`, // -> 모든 유저
  GAME_READY: `${GAME_NAME}/game-ready`, // <- 방장
  START_VOTE: `${GAME_NAME}/start-vote`, // <- 방장
  VOTE: `${GAME_NAME}/vote`, // <- 모든 유저
  VOTE_COMPLETE: `${GAME_NAME}/vote-complete`, // -> 모든 유저
  VOTE_CONFIRM: `${GAME_NAME}/vote-confirm`, // <- 방장
  REVOTE_WAITING: `${GAME_NAME}/revote-waiting`,
  VOTE_RESULT_DECIDE: `${GAME_NAME}/vote-result-decide`, // -> 모든 유저
  EXECUTED: `${GAME_NAME}/executed`, // -> 모든 유저
  NO_ONE_EXECUTED: `${GAME_NAME}/no-one-executed`, // -> 모든 유저
  START_DAY: `${GAME_NAME}/start-day`, // -> 모든 유저
  START_NIGHT: `${GAME_NAME}/start-night`, // <- 방장, -> 모든 유저
  MAFIA_KILL_START: `${GAME_NAME}/mafia-kill-start`, // <- 방장, -> 모든 유저
  MAFIA_KILL: `${GAME_NAME}/mafia-kill`, // <-> 마피아
  MAFIA_KILL_DECIDE: `${GAME_NAME}/mafia-kill-decide`, // -> 모든 유저
  MAFIA_KILL_TARGET_MISMATCH: `${GAME_NAME}/mafia-kill-target-mismatch`, // -> 마피아
  MAFIA_KILL_VOTE_COMPLETE: `${GAME_NAME}/mafia-kill-vote-complete`, // -> 모든 유저
  POLICE_INVESTIGATE_START: `${GAME_NAME}/police-investigate-start`, // <- 방장, -> 모든 유저
  POLICE_INVESTIGATE: `${GAME_NAME}/police-investigate`, // <-> 경찰
  POLICE_INVESTIGATE_RESULT: `${GAME_NAME}/police-investigate-result`, // -> 모든 유저
  DOCTOR_HEAL_START: `${GAME_NAME}/doctor-heal-start`, // <- 방장, -> 모든 유저
  DOCTOR_HEAL: `${GAME_NAME}/doctor-heal`, // <-> 의사
  DOCTOR_HEAL_DECIDE: `${GAME_NAME}/doctor-heal-decide`, // -> 모든 유저
  NIGHT_RESULT_ANNOUNCEABLE: `${GAME_NAME}/night-result-announceable`, // -> 방장
  NIGHT_RESULT: `${GAME_NAME}/night-result`, // -> 모든 유저
  GAME_RESULT: `${GAME_NAME}/game-result`, // -> 모든 유저
  MURDERED: `${GAME_NAME}/murdered`, // -> 모든 유저
  REVIVED: `${GAME_NAME}/revived`, // -> 모든 유저
  MAFIA_WIN: `${GAME_NAME}/mafia-win`,
  MEMO: `${GAME_NAME}/memo`,
  CITIZEN_WIN: `${GAME_NAME}/citizen-win`,
  LOG: `${GAME_NAME}/log`,
};

const Stage = {
  INITIAL: 'initial', // 초기 단계
  NEED_JOB_SETTING: 'need-job-setting', // 직업 설정 단계
  JOB_CONFIRMING: 'job-confirming', // 직업 확인 단계
  NIGHT_RESULT_ANNOUNCEMENT: 'night-result-announcement', // 밤 결과 발표 단계
  PROCESS_DAY: 'process-day', // 낮 단계 (회의)
  VOTE_FOR_EXECUTION: 'vote-for-execution', // 투표 단계 (투표)
  EXECUTION_CONFIGM: 'execution-confirm', // 처형 확인 단계
  WAITING_FOR_REVOTE: 'waiting-for-revote', // 재투표 대기 단계 (방장 결정: 그냥 진행[투표 무시] or 재투표)
  PROCESS_NIGHT: 'process-night',
  MAFIA_KILL: 'mafia-kill',
  POLICE_INVESTIGATE: 'police-investigate',
  DOCTOR_HEAL: 'doctor-heal',
  END: 'end',
};
type Stage = (typeof Stage)[keyof typeof Stage];

const Jobs = {
  CITIZEN: 'citizen',
  MAFIA: 'mafia',
  POLICE: 'police',
  DOCTOR: 'doctor',
};
type Job = (typeof Jobs)[keyof typeof Jobs];

const Event = {
  DAY_START: 'day-start',
  NIGHT_START: 'night-start',
  MAFIA_KILL: 'mafia-kill',
  POLICE_INVESTIGATE: 'police-investigate',
  DOCTOR_HEAL: 'doctor-heal',
  MURDERED: 'murdered',
  REVIVED: 'revived',
  EXECUTED: 'executed',
  NO_ONE_EXECUTED: 'no-one-executed',
  MAFIA_WIN: 'mafia-win',
  CITIZEN_WIN: 'citizen-win',
};
type Event = (typeof Event)[keyof typeof Event];

const Time = {
  DAY: 'day',
  NIGHT: 'night',
};
type Time = (typeof Time)[keyof typeof Time];

class EventLog {
  public event: Event;
  public payload: any;
  public timestamp: number;

  constructor(event: Event, payload: any) {
    this.event = event;
    this.payload = payload;
    this.timestamp = Date.now();
  }
}

class MemberStatus extends StationMemberStatus {
  public job: Job | null;
  public memo: string;
  public alive: boolean = true;
  public vote: number | null = null;
  public agreeExecution: boolean | null = null;
  public victimForMafia: number | null = null;

  public initialize(): void {
    this.job = null;
    this.memo = '';
    this.alive = true;
    this.vote = null;
    this.agreeExecution = null;
    this.victimForMafia = null;
  }
}

class SessionData extends StationData<MemberStatus> {
  public jobSet: boolean = false;
  public stage: Stage = Stage.INITIAL;
  public nextToBeVoteKilled: number | null = null;
  public nextToBeKilled: number | null = null;
  public nextToBeHealed: number | null = null;
  public eventLog: EventLog[] = [];
  public time: Time = Time.DAY;
  public voteCount: number = 0;
  public voteConfirmCount: number = 0;
  public mafiaKillVoteCount: number = 0;
  public dayCount: number = 0;
  public mafiaWin: boolean | null = null;

  public initialize(): void {
    this.jobSet = false;
    this.stage = Stage.INITIAL;
    this.nextToBeVoteKilled = null;
    this.nextToBeKilled = null;
    this.nextToBeHealed = null;
    this.eventLog = [];
    this.time = Time.DAY;
    this.voteCount = 0;
    this.voteConfirmCount = 0;
    this.mafiaKillVoteCount = 0;
    this.dayCount = 0;
    this.mafiaWin = null;
  }
}

@Injectable()
export class MafiaService extends PlayStationService<
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
    sessionData: SessionData,
    uid: number,
    isCreator: boolean,
    topic: string,
    payload: any,
  ): void {
    switch (topic) {
      case TOPICS.JOB_SETTING:
        this.handleJobSetting(sessionData, isCreator, payload);
        break;
      case TOPICS.GAME_READY:
        this.handleGameReady(sessionData, isCreator, payload);
        break;
      case TOPICS.START_VOTE:
        this.handleStartVote(sessionData, isCreator, payload);
        break;
      case TOPICS.VOTE:
        this.handleVote(sessionData, uid, payload);
        break;
      case TOPICS.VOTE_CONFIRM:
        this.handleVoteConfirm(sessionData, uid, payload);
        break;
      case TOPICS.START_NIGHT:
        this.handleStartNight(sessionData, isCreator, payload);
        break;
      case TOPICS.MAFIA_KILL_START:
        this.handleMafiaKillStart(sessionData, isCreator, payload);
        break;
      case TOPICS.MAFIA_KILL:
        this.handleMafiaKill(sessionData, uid, payload);
        break;
      case TOPICS.POLICE_INVESTIGATE:
        this.handlePoliceInvestigate(sessionData, uid, payload);
        break;
      case TOPICS.DOCTOR_HEAL:
        this.handleDoctorHeal(sessionData, uid, payload);
        break;
      case TOPICS.MEMO:
        this.handleMemo(sessionData, uid, payload);
        break;
      case TOPICS.NIGHT_RESULT:
        this.handleNightResult(sessionData, isCreator, payload);
        break;
      default:
        this.logger.warn(`Unknown topic: ${topic}`);
        break;
    }
  }

  public async handleSessionStart(sessionData: SessionData): Promise<void> {
    sessionData.stage = Stage.NEED_JOB_SETTING;
    this.socketService.unicastToSession(
      sessionData.creatorUid,
      sessionData.id,
      TOPICS.NEED_JOB_SETTING,
      null,
    );
  }

  public async handleSessionEnd(sessionData: SessionData): Promise<void> {}

  handleRoundStart(sessionData: SessionData, uid: number): void {}

  async handleRoundEnd(sessionData: SessionData): Promise<void> {
    sessionData.stage = Stage.END;

    this.socketService.broadcastToSession(sessionData.id, TOPICS.GAME_RESULT, {
      jobs: Array.from(sessionData.participantStatusMap.values()).map(
        (status) => {
          return {
            uid: status.uid,
            nickname: status.nickname,
            job: status.job,
            alive: status.alive,
          };
        },
      ),
    });
  }

  async initialize(sessionData: SessionData): Promise<void> {
    sessionData.stage = Stage.NEED_JOB_SETTING;
    this.socketService.unicastToSession(
      sessionData.creatorUid,
      sessionData.id,
      TOPICS.NEED_JOB_SETTING,
      null,
    );
  }

  async getCurrentSessionData(
    sessionData: SessionData,
    uid: number,
  ): Promise<any | null> {
    const amIMafia =
      sessionData.participantStatusMap.get(uid)?.job === Jobs.MAFIA;
    return {
      jobSet: sessionData.jobSet,
      stage: sessionData.stage,
      eventLog: sessionData.eventLog,
      time: sessionData.time,
      voteCount: sessionData.voteCount,
      voteConfirmCount: sessionData.voteConfirmCount,
      mafiaKillVoteCount: sessionData.mafiaKillVoteCount,
      nextToBeVoteKilled: sessionData.nextToBeVoteKilled,
      participants: Array.from(sessionData.participantStatusMap.values()).map(
        (status) => {
          const isMe = status.uid == uid;
          return {
            uid: status.uid,
            nickname: status.nickname,
            alive: status.alive,
            vote: isMe ? status.vote : null,
            agreeExecution: status.agreeExecution,
            job:
              (amIMafia && status.job === Jobs.MAFIA) || isMe
                ? status.job
                : null,
            victimForMafia:
              status.job === Jobs.MAFIA ? status.victimForMafia : null,
            memo: isMe ? status.memo : null,
          };
        },
      ),
      aliveMafiaCount: Array.from(
        sessionData.participantStatusMap.values(),
      ).filter((status) => status.alive && status.job === Jobs.MAFIA).length,
      dayCount: sessionData.dayCount,
      mafiaWin: sessionData.mafiaWin,
      logs: sessionData.eventLog,
      gameResult: {
        jobs: Array.from(sessionData.participantStatusMap.values()).map(
          (status) => {
            return {
              uid: status.uid,
              nickname: status.nickname,
              job: status.job,
              alive: status.alive,
            };
          },
        ),
      },
    };
  }

  /* ------------------------ custom ------------------------ */

  handleJobSetting(
    sessionData: SessionData,
    isCreator: boolean,
    payload: any,
  ): void {
    if (!isCreator) return;
    if (sessionData.jobSet) return;
    if (sessionData.stage !== Stage.NEED_JOB_SETTING) return;

    // set job to members
    const memberCount = sessionData.participantStatusMap.size;
    if (memberCount < 4) return;

    let mafiaCount = 0;
    let policeCount = 0;
    let doctorCount = 0;

    // set mafia count
    if (memberCount <= 6) mafiaCount = 1;
    else if (mafiaCount <= 9) mafiaCount = 2;
    else mafiaCount = 3;

    // set police count
    if (memberCount >= 7) policeCount = 1;

    // set doctor count
    if (mafiaCount >= 9) doctorCount = 1;

    // set all members to citizen
    for (const memberStatus of sessionData.participantStatusMap.values()) {
      memberStatus.job = Jobs.CITIZEN;
    }

    const jobQueue = [];
    for (let i = 0; i < mafiaCount; i++) {
      jobQueue.push(Jobs.MAFIA);
    }
    for (let i = 0; i < policeCount; i++) {
      jobQueue.push(Jobs.POLICE);
    }
    for (let i = 0; i < doctorCount; i++) {
      jobQueue.push(Jobs.DOCTOR);
    }

    const unallocatedMemberMap = {};
    for (const memberStatus of sessionData.participantStatusMap.values()) {
      unallocatedMemberMap[memberStatus.uid] = null;
    }
    while (jobQueue.length > 0) {
      const randomIndex = Math.floor(Math.random() * jobQueue.length);
      const randomJob = jobQueue.splice(randomIndex, 1)[0];
      const shuffledUids = Object.keys(unallocatedMemberMap).sort(
        (a, b) => Math.random() - 0.5,
      );
      const randomUid = parseInt(shuffledUids[0]);
      sessionData.participantStatusMap.get(randomUid).job = randomJob;
      delete unallocatedMemberMap[randomUid];
    }

    sessionData.jobSet = true;
    sessionData.stage = Stage.JOB_CONFIRMING;

    for (const memberStatus of sessionData.participantStatusMap.values()) {
      this.socketService.unicastToSession(
        memberStatus.uid,
        sessionData.id,
        TOPICS.JOB_SETTING,
        {
          job: memberStatus.job,
        },
      );
    }

    this.socketService.broadcastToSession(
      sessionData.id,
      TOPICS.JOB_CONFIRMING,
      null,
    );
  }

  handleGameReady(
    sessionData: SessionData,
    isCreator: boolean,
    payload: any,
  ): void {
    if (!isCreator) return;
    if (sessionData.stage !== Stage.JOB_CONFIRMING) return;

    this.handleNightStart(sessionData);
  }

  handleStartVote(
    sessionData: SessionData,
    isCreator: boolean,
    payload: any,
  ): void {
    if (!isCreator) return;
    if (
      !(
        sessionData.stage === Stage.PROCESS_DAY ||
        sessionData.stage === Stage.WAITING_FOR_REVOTE
      )
    )
      return;

    sessionData.stage = Stage.VOTE_FOR_EXECUTION;

    // set all participants vote as null
    for (const status of sessionData.participantStatusMap.values()) {
      status.vote = null;
    }

    const aliveParticipants = Array.from(
      sessionData.participantStatusMap.values(),
    ).filter((status) => status.alive);

    this.socketService.broadcastToSession(
      sessionData.id,
      TOPICS.START_VOTE,
      aliveParticipants.map((e) => {
        return {
          uid: e.uid,
          nickname: e.nickname,
        };
      }),
    );
  }

  handleVote(sessionData: SessionData, uid: number, payload: any): void {
    if (sessionData.stage !== Stage.VOTE_FOR_EXECUTION) return;

    const voter = sessionData.participantStatusMap.get(uid);
    if (!voter) return;
    if (!voter.alive) return; // 죽은 사람은 투표할 수 없음
    if (voter.vote !== null) return; // 이미 투표함

    // payload = targetUid
    // check if target is alive or valid
    const target = sessionData.participantStatusMap.get(payload);
    if (!target) return;

    voter.vote = target.uid;

    this.checkForVoteComplete(sessionData);
  }

  handleVoteConfirm(sessionData: SessionData, uid: number, payload: any): void {
    if (sessionData.stage !== Stage.EXECUTION_CONFIGM) return;
    if (sessionData.nextToBeVoteKilled === null) return;
    const participant = sessionData.participantStatusMap.get(uid);
    if (!participant) return;
    participant.agreeExecution = payload === true;

    this.checkForVoteConfirmComplete(sessionData);
  }

  handleStartNight(
    sessionData: SessionData,
    isCreator: boolean,
    payload: any,
  ): void {
    if (!isCreator) return;
    if (!(sessionData.stage === Stage.WAITING_FOR_REVOTE)) return;

    this.handleNightStart(sessionData);
  }

  handleMafiaKillStart(
    sessionData: SessionData,
    isCreator: boolean,
    payload: any,
  ): void {
    if (!isCreator) return;
    if (sessionData.stage !== Stage.PROCESS_NIGHT) return;

    sessionData.stage = Stage.MAFIA_KILL;

    this.socketService.broadcastToSession(
      sessionData.id,
      TOPICS.MAFIA_KILL_START,
    );

    const alivers = Array.from(
      sessionData.participantStatusMap.values(),
    ).filter((status) => status.alive && status.job !== Jobs.MAFIA);

    const aliveMafias = Array.from(
      sessionData.participantStatusMap.values(),
    ).filter((status) => status.alive && status.job === Jobs.MAFIA);

    for (const mafia of Array.from(
      sessionData.participantStatusMap.values(),
    ).filter((status) => status.job === Jobs.MAFIA)) {
      this.socketService.unicastToSession(
        mafia.uid,
        sessionData.id,
        TOPICS.MAFIA_KILL,
        {
          aliveMafiaCount: aliveMafias.length,
        },
      );
    }
  }

  handleMafiaKill(sessionData: SessionData, uid: number, payload: any): void {
    if (sessionData.stage !== Stage.MAFIA_KILL) return;
    const mafia = sessionData.participantStatusMap.get(uid);
    if (!mafia) return;
    if (mafia.job !== Jobs.MAFIA) return;

    const target = sessionData.participantStatusMap.get(payload);
    if (!target) return;
    if (!target.alive) return;

    const source = sessionData.participantStatusMap.get(uid);
    if (!source) return;
    if (source.job !== Jobs.MAFIA) return;

    mafia.victimForMafia = target.uid;

    const mafiaKillVoteCount = Array.from(
      sessionData.participantStatusMap.values(),
    ).filter(
      (status) =>
        status.alive &&
        status.job === Jobs.MAFIA &&
        status.victimForMafia !== null,
    ).length;

    sessionData.mafiaKillVoteCount = mafiaKillVoteCount;

    const mafias = Array.from(sessionData.participantStatusMap.values()).filter(
      (status) => status.job === Jobs.MAFIA && status.alive,
    );

    for (const m of mafias) {
      this.socketService.unicastToSession(
        m.uid,
        sessionData.id,
        TOPICS.MAFIA_KILL_DECIDE,
        {
          sourceUid: source.uid,
          sourceNickname: source.nickname,
          targetUid: target.uid,
          targetNickname: target.nickname,
          mafiaKillVoteCount,
          aliveMafiaCount: mafias.length,
        },
      );
    }

    this.checkForMafiaKillVoteComplete(sessionData);
  }

  handlePoliceInvestigate(
    sessionData: SessionData,
    uid: number,
    payload: any,
  ): void {
    if (sessionData.stage !== Stage.POLICE_INVESTIGATE) return;
    const police = sessionData.participantStatusMap.get(uid);
    if (!police) {
      this.logger.warn(`Police ${uid} not found`);
      return;
    }
    if (police.job !== Jobs.POLICE) {
      this.logger.warn(`Not a police`);
      return;
    }

    const target = sessionData.participantStatusMap.get(payload);
    if (!target) {
      this.logger.warn(`Target ${payload} not found`);
      return;
    }

    this.socketService.unicastToSession(
      police.uid,
      sessionData.id,
      TOPICS.POLICE_INVESTIGATE_RESULT,
      {
        targetUid: target.uid,
        targetNickname: target.nickname,
        job: target.job,
      },
    );

    const doctor = Array.from(sessionData.participantStatusMap.values()).find(
      (status) => status.job === Jobs.DOCTOR && status.alive,
    );

    if (doctor != null) {
      sessionData.stage = Stage.DOCTOR_HEAL;
      this.socketService.broadcastToSession(
        sessionData.id,
        TOPICS.DOCTOR_HEAL_START,
      );
      this.socketService.unicastToSession(
        doctor.uid,
        sessionData.id,
        TOPICS.DOCTOR_HEAL,
        Array.from(sessionData.participantStatusMap.values())
          .filter((status) => status.alive && status.uid !== doctor.uid)
          .map((status) => {
            return {
              uid: status.uid,
              nickname: status.nickname,
            };
          }),
      );
    } else {
      this.handleDayStart(sessionData);
    }
  }

  handleDoctorHeal(sessionData: SessionData, uid: number, payload: any): void {
    const doctor = sessionData.participantStatusMap.get(uid);
    if (!doctor) return;
    if (doctor.job !== Jobs.DOCTOR) return;

    const target = sessionData.participantStatusMap.get(payload);
    if (!target) return;

    sessionData.nextToBeHealed = target.uid;

    this.socketService.broadcastToSession(
      sessionData.id,
      TOPICS.DOCTOR_HEAL_DECIDE,
    );

    this.handleDayStart(sessionData);
  }

  handleMemo(sessionData: SessionData, uid: number, payload: any): void {
    const participant = sessionData.participantStatusMap.get(uid);
    if (!participant) return;
    participant.memo = payload;

    this.socketService.unicastToSession(
      uid,
      sessionData.id,
      TOPICS.MEMO,
      payload,
    );
  }

  handleNightResult(
    sessionData: SessionData,
    isCreator: boolean,
    payload: any,
  ): void {
    if (!isCreator) return;
    if (sessionData.stage !== Stage.NIGHT_RESULT_ANNOUNCEMENT) return;
    if (sessionData.nextToBeKilled == null) {
      this.logger.warn(`No one to be killed`);
      return;
    }

    const revived = sessionData.nextToBeHealed === sessionData.nextToBeKilled;

    this.socketService.broadcastToSession(sessionData.id, TOPICS.NIGHT_RESULT, {
      targetUid: sessionData.nextToBeKilled,
      revived,
    });

    const target = sessionData.participantStatusMap.get(
      sessionData.nextToBeKilled,
    );

    if (!revived) {
      if (!target) return;
      target.alive = false;
      this.socketService.broadcastToSession(sessionData.id, TOPICS.MURDERED, {
        targetUid: target.uid,
        targetNickname: target.nickname,
        doctorExists: sessionData.nextToBeHealed != null,
      });
      this.broadcastAndSaveEventLog(sessionData, Event.MURDERED, {
        targetUid: target.uid,
        targetNickname: target.nickname,
      });
    } else {
      const target = sessionData.participantStatusMap.get(
        sessionData.nextToBeKilled,
      );
      if (!target) return;
      this.socketService.broadcastToSession(sessionData.id, TOPICS.REVIVED, {
        targetUid: target.uid,
        targetNickname: target.nickname,
      });
      this.broadcastAndSaveEventLog(sessionData, Event.REVIVED, {
        targetUid: target.uid,
        targetNickname: target.nickname,
      });
    }

    sessionData.nextToBeKilled = null;

    const done = this.checkForGameEnd(sessionData);
    if (done) return;

    setTimeout(() => {
      this.handleDayStart(sessionData);
    }, 3000);
  }

  handleDayStart(sessionData: SessionData) {
    if (sessionData.nextToBeKilled != null) {
      sessionData.stage = Stage.NIGHT_RESULT_ANNOUNCEMENT;
      this.socketService.broadcastToSession(
        sessionData.id,
        TOPICS.NIGHT_RESULT_ANNOUNCEABLE,
      );
    } else {
      sessionData.stage = Stage.PROCESS_DAY;
      sessionData.time = Time.DAY;
      this.socketService.broadcastToSession(sessionData.id, TOPICS.START_DAY);
      this.broadcastAndSaveEventLog(sessionData, Event.DAY_START, null);
      this.sanitizeNightResult(sessionData);
    }
  }

  handleNightStart(sessionData: SessionData) {
    sessionData.stage = Stage.PROCESS_NIGHT;
    sessionData.time = Time.NIGHT;

    this.socketService.broadcastToSession(sessionData.id, TOPICS.START_NIGHT);
    this.broadcastAndSaveEventLog(sessionData, Event.NIGHT_START, null);

    this.handleMafiaKillStart(sessionData, true, null);
  }

  sanitizeNightResult(sessionData: SessionData): void {
    sessionData.nextToBeKilled = null;
    sessionData.nextToBeHealed = null;
    sessionData.nextToBeVoteKilled = null;
    sessionData.voteCount = 0;
    sessionData.voteConfirmCount = 0;
    sessionData.mafiaKillVoteCount = 0;
    sessionData.dayCount++;
    for (const status of sessionData.participantStatusMap.values()) {
      status.agreeExecution = null;
      status.vote = null;
      status.victimForMafia = null;
    }
  }

  checkForVoteComplete(sessionData: SessionData): void {
    const aliveCount = Array.from(
      sessionData.participantStatusMap.values(),
    ).filter((status) => status.alive).length;
    const voteCount = Array.from(
      sessionData.participantStatusMap.values(),
    ).filter((status) => status.alive && status.vote !== null).length;

    sessionData.voteCount = voteCount;

    // send currnet vote count
    this.socketService.broadcastToSession(sessionData.id, TOPICS.VOTE, {
      voteCount,
    });

    if (voteCount >= aliveCount) {
      // vote complete
      const countMap = {};
      for (const status of sessionData.participantStatusMap.values()) {
        if (status.vote === null) continue;
        if (!countMap.hasOwnProperty(status.vote)) {
          countMap[status.vote] = 0;
        }
        countMap[status.vote]++;
      }

      let maxVoteCount = 0;
      let maxVoteUid = null;
      for (const uid in countMap) {
        if (countMap[uid] > maxVoteCount) {
          maxVoteCount = countMap[uid];
          maxVoteUid = uid;
        }
      }

      if (maxVoteUid === null) {
        // no one voted
        sessionData.nextToBeVoteKilled = null;
        this.logger.warn(`No one voted`);
        return;
      }

      // check if max vote count is unique
      let unique = true;
      for (const uid in countMap) {
        if (countMap[uid] === maxVoteCount && uid !== maxVoteUid) {
          unique = false;
          break;
        }
      }

      // broadcast vote result
      this.socketService.broadcastToSession(
        sessionData.id,
        TOPICS.VOTE_COMPLETE,
        Object.keys(countMap).map((uid) => {
          return {
            uid,
            nickname: sessionData.participantStatusMap.get(parseInt(uid))
              .nickname,
            voteCount: countMap[uid],
          };
        }),
      );

      if (unique) {
        // decide for execution
        const targetUser = sessionData.participantStatusMap.get(
          parseInt(maxVoteUid),
        );
        sessionData.stage = Stage.EXECUTION_CONFIGM;
        sessionData.nextToBeVoteKilled = parseInt(maxVoteUid);
        this.socketService.broadcastToSession(
          sessionData.id,
          TOPICS.VOTE_RESULT_DECIDE,
          {
            targetUid: targetUser.uid,
            targetNickname: targetUser.nickname,
            voteCount: maxVoteCount,
          },
        );
      } else {
        // max vote count is not unique
        sessionData.stage = Stage.WAITING_FOR_REVOTE;
        this.socketService.broadcastToSession(
          sessionData.id,
          TOPICS.REVOTE_WAITING,
        );
      }
    }
  }

  checkForVoteConfirmComplete(sessionData: SessionData): void {
    const aliveNonExecuteeCount = Array.from(
      sessionData.participantStatusMap.values(),
    ).filter(
      (status) => status.alive && status.uid != sessionData.nextToBeVoteKilled,
    ).length;
    const voteConfirmCount = Array.from(
      sessionData.participantStatusMap.values(),
    ).filter((status) => status.alive && status.agreeExecution !== null).length;

    sessionData.voteConfirmCount = voteConfirmCount;
    this.socketService.broadcastToSession(sessionData.id, TOPICS.VOTE_CONFIRM, {
      voteConfirmCount,
    });

    if (voteConfirmCount >= aliveNonExecuteeCount) {
      // check if execution is valid
      const executionAgreeCount = Array.from(
        sessionData.participantStatusMap.values(),
      ).filter(
        (status) => status.alive && status.agreeExecution === true,
      ).length;
      const agreeRate = executionAgreeCount / aliveNonExecuteeCount;

      if (agreeRate >= 0.5) {
        if (sessionData.nextToBeVoteKilled == null) {
          this.logger.warn(`nextToBeVoteKilled is null`);
          return;
        }
        // execute
        const target = sessionData.participantStatusMap.get(
          sessionData.nextToBeVoteKilled,
        );
        if (!target) return;
        target.alive = false;

        this.socketService.broadcastToSession(sessionData.id, TOPICS.EXECUTED, {
          targetUid: target.uid,
          targetNickname: target.nickname,
        });
        this.broadcastAndSaveEventLog(sessionData, Event.EXECUTED, {
          targetUid: target.uid,
          targetNickname: target.nickname,
        });
      } else {
        // do not execute
        this.socketService.broadcastToSession(
          sessionData.id,
          TOPICS.NO_ONE_EXECUTED,
        );
        this.broadcastAndSaveEventLog(sessionData, Event.NO_ONE_EXECUTED, null);
      }

      const done = this.checkForGameEnd(sessionData);
      if (done) return;

      this.handleNightStart(sessionData);
    }
  }

  checkForMafiaKillVoteComplete(sessionData: SessionData): void {
    const aliveMafiaCount = Array.from(
      sessionData.participantStatusMap.values(),
    ).filter((status) => status.alive && status.job === Jobs.MAFIA).length;
    const mafiaKillVoteCount = Array.from(
      sessionData.participantStatusMap.values(),
    ).filter(
      (status) =>
        status.alive &&
        status.job === Jobs.MAFIA &&
        status.victimForMafia !== null,
    ).length;

    if (mafiaKillVoteCount >= aliveMafiaCount) {
      this.socketService.broadcastToSession(
        sessionData.id,
        TOPICS.MAFIA_KILL_VOTE_COMPLETE,
      );

      const countMap = {};
      for (const status of sessionData.participantStatusMap.values()) {
        if (!(status.alive && status.job === Jobs.MAFIA)) continue;
        if (status.victimForMafia === null) continue;
        if (!countMap.hasOwnProperty(status.victimForMafia)) {
          countMap[status.victimForMafia] = 0;
        }
        countMap[status.victimForMafia]++;
      }

      let maxVoteCount = 0;
      let maxVoteUid = null;
      for (const uid in countMap) {
        if (countMap[uid] > maxVoteCount) {
          maxVoteCount = countMap[uid];
          maxVoteUid = uid;
        }
      }

      if (maxVoteUid === null) {
        // no one voted
        sessionData.nextToBeKilled = null;
        this.logger.warn(`No one voted`);
        return;
      }

      // check if max vote count is unique
      let unique = true;
      for (const uid in countMap) {
        if (countMap[uid] === maxVoteCount && uid !== maxVoteUid) {
          unique = false;
          break;
        }
      }

      if (unique) {
        sessionData.nextToBeKilled = parseInt(maxVoteUid);

        const police = Array.from(
          sessionData.participantStatusMap.values(),
        ).find((status) => status.job === Jobs.POLICE && status.alive);
        const doctor = Array.from(
          sessionData.participantStatusMap.values(),
        ).find((status) => status.job === Jobs.DOCTOR && status.alive);
        if (police != null) {
          sessionData.stage = Stage.POLICE_INVESTIGATE;
          this.socketService.broadcastToSession(
            sessionData.id,
            TOPICS.POLICE_INVESTIGATE_START,
          );
          this.socketService.unicastToSession(
            police.uid,
            sessionData.id,
            TOPICS.POLICE_INVESTIGATE,
            Array.from(sessionData.participantStatusMap.values())
              .filter((status) => status.alive && status.uid !== police.uid)
              .map((status) => {
                return {
                  uid: status.uid,
                  nickname: status.nickname,
                };
              }),
          );
        } else if (doctor != null) {
          sessionData.stage = Stage.DOCTOR_HEAL;
          this.socketService.broadcastToSession(
            sessionData.id,
            TOPICS.DOCTOR_HEAL_START,
          );
          this.socketService.unicastToSession(
            doctor.uid,
            sessionData.id,
            TOPICS.DOCTOR_HEAL,
            Array.from(sessionData.participantStatusMap.values())
              .filter((status) => status.alive && status.uid !== doctor.uid)
              .map((status) => {
                return {
                  uid: status.uid,
                  nickname: status.nickname,
                };
              }),
          );
        } else {
          this.handleDayStart(sessionData);
        }
      } else {
        // max vote count is not unique (mismatch)
        const mafias = Array.from(
          sessionData.participantStatusMap.values(),
        ).filter((status) => status.job === Jobs.MAFIA && status.alive);

        for (const m of mafias) {
          this.socketService.unicastToSession(
            m.uid,
            sessionData.id,
            TOPICS.MAFIA_KILL_TARGET_MISMATCH,
          );
        }
      }
    }
  }

  checkForGameEnd(sessionData: SessionData): boolean {
    const citizenCount = Array.from(
      sessionData.participantStatusMap.values(),
    ).filter((status) => status.job !== Jobs.MAFIA && status.alive).length;
    const mafiaCount = Array.from(
      sessionData.participantStatusMap.values(),
    ).filter((status) => status.job === Jobs.MAFIA && status.alive).length;

    const mafias = Array.from(sessionData.participantStatusMap.values()).filter(
      (status) => status.job === Jobs.MAFIA,
    );
    const citizens = Array.from(
      sessionData.participantStatusMap.values(),
    ).filter((status) => status.job !== Jobs.MAFIA);

    if (mafiaCount === 0) {
      // citizen win
      for (const citizen of citizens) {
        this.socketService.unicastToSession(
          citizen.uid,
          sessionData.id,
          TOPICS.CITIZEN_WIN,
          {
            victory: true,
          },
        );
      }
      for (const mafia of mafias) {
        this.socketService.unicastToSession(
          mafia.uid,
          sessionData.id,
          TOPICS.CITIZEN_WIN,
          {
            victory: false,
          },
        );
      }
      sessionData.mafiaWin = false;
      this._handleRoundEnd(sessionData.id);
      return true;
    } else if (mafiaCount >= citizenCount) {
      // mafia win
      for (const citizen of citizens) {
        this.socketService.unicastToSession(
          citizen.uid,
          sessionData.id,
          TOPICS.MAFIA_WIN,
          {
            victory: false,
          },
        );
      }
      for (const mafia of mafias) {
        this.socketService.unicastToSession(
          mafia.uid,
          sessionData.id,
          TOPICS.MAFIA_WIN,
          {
            victory: true,
          },
        );
      }
      sessionData.mafiaWin = true;
      this._handleRoundEnd(sessionData.id);
      return true;
    }
    return false;
  }

  broadcastAndSaveEventLog(
    sessionData: SessionData,
    event: Event,
    payload: any | null,
  ): void {
    const eventLog = new EventLog(event, payload);
    sessionData.eventLog.push(eventLog);
    this.socketService.broadcastToSession(sessionData.id, TOPICS.LOG, payload);
  }
}
