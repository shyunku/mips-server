import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Game } from './game.entity';
import { User } from './user.entity';

@Entity('favorites')
export class Favorite {
  @PrimaryColumn()
  userId: number;

  @PrimaryColumn()
  gameId: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToOne(() => Game)
  @JoinColumn({ name: 'gameId' })
  game: Game;
}
