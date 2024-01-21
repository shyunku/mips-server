import { Game } from '@/game/game.entity';
import { User } from '@/user/user.entity';
import { GameSession } from './session.entity';

export class SessionSafeParticipantDto {
  uid: number;
  nickname: string;

  static fromUser(user: User): SessionSafeParticipantDto {
    const dto = new SessionSafeParticipantDto();
    dto.uid = user.uid;
    dto.nickname = user.nickname;
    return dto;
  }
}

export class SessionCreateDto {
  id: number;
  game: Game;
  code: string;
  status: number;
  creator: SessionSafeParticipantDto;
  participants: SessionSafeParticipantDto[];

  static fromSession(session: GameSession): SessionCreateDto {
    const dto = new SessionCreateDto();
    dto.id = session.id;
    dto.game = session.game;
    dto.code = session.code;
    dto.status = session.status;
    dto.creator = SessionSafeParticipantDto.fromUser(session.creator);
    dto.participants = session.participants.map((user) =>
      SessionSafeParticipantDto.fromUser(user),
    );
    return dto;
  }
}
