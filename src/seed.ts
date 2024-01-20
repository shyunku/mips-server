import { DataSource } from 'typeorm';

import OrmConfig from '../configs/ormconfig.json';
import { Game } from './entity/game.entity';

const initialGames: Game[] = [
  new Game({
    name: '죽음의 10초',
    description: '게임1 설명',
    minMembers: 2,
    maxMembers: 4,
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
