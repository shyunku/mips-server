import { SESSION_STATUS } from '@/session/session.entity';
import { Game } from './game.entity';

export class GameDto {
  gid: number;
  name: string;
  description: string;
  minMembers: number;
  maxMembers: number;
  deployed: boolean;

  favorited: boolean;

  favorites: number;
  played: number;

  static from(dto: Partial<Game>, userId: number) {
    const game = new GameDto();
    game.gid = dto.gid;
    game.name = dto.name;
    game.description = dto.description;
    game.minMembers = dto.minMembers;
    game.maxMembers = dto.maxMembers;
    game.deployed = dto.deployed;

    game.favorited = dto.favorites.some((e) => e.userId === userId);

    game.favorites = dto.favorites.length;
    game.played = dto.sessions.filter(
      (e) => e.status === SESSION_STATUS.ENDED,
    ).length;
    return game;
  }
}
