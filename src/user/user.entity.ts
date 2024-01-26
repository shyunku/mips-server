import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GameSession } from '../session/session.entity';
import { Favorite } from '@/favorite/favorite.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  uid: number;

  @Column()
  nickname: string;

  @Column({ nullable: true })
  id?: string;

  @Column({ nullable: true })
  encryptedPassword?: string;

  @Column()
  autoGenerated: boolean = true;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => GameSession, (user) => user.participants, {
    onDelete: 'CASCADE',
  })
  joinedSessions: GameSession[];

  @OneToMany(() => GameSession, (session) => session.creator)
  createdSessions: GameSession[];

  @OneToMany(() => Favorite, (favorite) => favorite.user)
  favorites: Favorite[];
}
