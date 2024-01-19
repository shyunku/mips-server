import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
}
