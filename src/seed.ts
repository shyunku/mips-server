import { DataSource } from 'typeorm';

import OrmConfig from '../configs/ormconfig.json';
import { Game } from './game/game.entity';

const initialGames: Game[] = [
  new Game({
    name: '죽음의 10초',
    description: '10초를 넘기지 않고 10초에 최대한 근접하게 멈추세요!',
    minMembers: 2,
    maxMembers: 30,
  }),
  new Game({
    name: '마피아 게임',
    description: '모두가 아는 그 게임',
    minMembers: 4,
    maxMembers: 12,
  }),
  new Game({
    name: '공범',
    description: '준비 중',
    minMembers: 1,
    maxMembers: 1,
  }),
];

async function seed() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: OrmConfig.host,
    port: OrmConfig.port,
    username: OrmConfig.username,
    password: OrmConfig.password,
    database: OrmConfig.database,
    entities: OrmConfig.entities,
    synchronize: false,
  });
  await dataSource.initialize();

  const gameRepository = dataSource.getRepository(Game);
  for (const game of initialGames) {
    const gameEntity = await gameRepository.findOne({
      where: { name: game.name },
    });
    if (!gameEntity) {
      await gameRepository.save(game);
    } else {
      // update
      gameEntity.description = game.description;
      gameEntity.minMembers = game.minMembers;
      gameEntity.maxMembers = game.maxMembers;
      await gameRepository.save(gameEntity);
    }
  }

  await dataSource.destroy();
}

export default seed;
