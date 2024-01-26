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
import { Game } from '@/game/game.entity';
import { User } from '@/user/user.entity';

@Entity('favorites')
export class Favorite {
  @PrimaryColumn()
  userId: number;

  @PrimaryColumn()
  gameId: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.favorites)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Game, (game) => game.favorites)
  @JoinColumn({ name: 'gameId' })
  game: Game;
}
