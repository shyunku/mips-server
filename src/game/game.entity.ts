import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { GameSession } from '../session/session.entity';

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

  @OneToMany(() => GameSession, (session) => session.game)
  sessions: GameSession[];
}
