import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { GameSession } from '../session/session.entity';
import { Favorite } from '@/favorite/favorite.entity';

@Entity('games')
export class Game {
  constructor(partial?: Partial<Game>) {
    Object.assign(this, partial);
  }

  @PrimaryGeneratedColumn()
  gid: number;

  @Column({ unique: true })
  name: string;

  @Column()
  description: string;

  @Column()
  minMembers: number;

  @Column()
  maxMembers: number;

  @Column({ default: false })
  deployed: boolean;

  @OneToMany(() => GameSession, (session) => session.game)
  sessions: GameSession[];

  @OneToMany(() => Favorite, (favorite) => favorite.game)
  favorites: Favorite[];
}
