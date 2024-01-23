import { SessionSafeParticipantDto } from '@/session/session.dto';
import { User } from '@/user/user.entity';

export const SOCKET_TOPICS = {
  TEST: 'test',
  SESSION_JOIN: 'session/join',
  SESSION_LEAVE: 'session/leave',
  SESSION_START: 'session/start',
  SESSION_END: 'session/end',
  SESSION_INGAME: 'session/ingame',
};

export const sessionRoom = (sessionId: number) => `session-${sessionId}`;

export class JoinSessionResult extends SessionSafeParticipantDto {}
