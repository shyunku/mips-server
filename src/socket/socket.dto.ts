import { SessionSafeParticipantDto } from '@/session/session.dto';
import { User } from '@/user/user.entity';

export const SOCKET_TOPICS = {
  TEST: 'test',
  SESSION_JOIN: 'session/join',
};

export const sessionRoom = (sessionId: number) => `session-${sessionId}`;

export class JoinSessionResult extends SessionSafeParticipantDto {}
