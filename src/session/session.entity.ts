import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Game } from '@/game/game.entity';
import { User } from '@/user/user.entity';

export const SESSION_STATUS = {
  WAITING: 0,
  PLAYING: 1,
  ENDED: 2,
} as const;
type SESSION_STATUS = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

@Entity('game_sessions')
export class GameSession {
  constructor(partial?: Partial<GameSession>) {
    Object.assign(this, partial);
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  password?: string;

  @Column()
  status: number = 0;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  endedAt?: Date;

  @ManyToOne(() => User, (user) => user.createdSessions, {
    onDelete: 'CASCADE',
  })
  creator: User;

  @ManyToMany(() => User, (user) => user.joinedSessions, {
    onDelete: 'CASCADE',
  })
  @JoinTable()
  participants: User[];

  @ManyToOne(() => Game, (game) => game.sessions)
  game: Game;
}
