import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Game } from './game.entity';
import { User } from './user.entity';

export const SESSION_STATUS = {
  WAITING: 0,
  PLAYING: 1,
  ENDED: 2,
} as const;
type SESSION_STATUS = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

@Entity('sessions')
export class Session {
  constructor(partial?: Partial<Session>) {
    Object.assign(this, partial);
  }

  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Game)
  game: Game;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  password?: string;

  @Column()
  status: number = 0;

  @OneToOne(() => User)
  creator: User;

  @OneToMany(() => User, (user) => user.uid)
  participants: User[];

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  startedAt?: Date;

  @Column()
  endedAt: Date;
}
