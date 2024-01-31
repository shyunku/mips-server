import { DataSource } from 'typeorm';

import OrmConfig from '../configs/ormconfig.json';
import { Game } from './game/game.entity';

const initialGames: Game[] = [
  new Game({
    gid: 1,
    name: '죽음의 10초',
    description: '10초를 넘기지 않고 10초에 최대한 근접하게 멈추세요!',
    minMembers: 2,
    maxMembers: 30,
    deployed: true,
  }),
  new Game({
    gid: 2,
    name: '마피아 게임',
    description: '거짓말을 하고 있는 마피아를 찾아 승리하세요!',
    minMembers: 4,
    maxMembers: 10,
    deployed: true,
  }),
  new Game({
    gid: 3,
    name: '7포커 (No Chip)',
    description: '포커를 하고 싶은데 칩이 없으신가요?',
    minMembers: 2,
    maxMembers: 7,
    deployed: true,
  }),
  new Game({
    gid: 4,
    name: '7포커',
    description: '국룰게임 세븐카드 스터드 포커',
    minMembers: 2,
    maxMembers: 5,
    deployed: false,
  }),
  new Game({
    gid: 5,
    name: '공범',
    description: '준비 중',
    minMembers: 1,
    maxMembers: 1,
    deployed: false,
  }),
  new Game({
    gid: 6,
    name: '금지어 게임',
    description: '준비 중',
    minMembers: 1,
    maxMembers: 1,
    deployed: false,
  }),
  new Game({
    gid: 7,
    name: 'GPS 마피아',
    description: '준비 중',
    minMembers: 1,
    maxMembers: 1,
    deployed: false,
  }),
  new Game({
    gid: 8,
    name: '공범',
    description: '준비 중',
    minMembers: 1,
    maxMembers: 1,
    deployed: false,
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
      gameEntity.deployed = game.deployed;
      await gameRepository.save(gameEntity);
    }
  }

  await dataSource.destroy();
}

export default seed;
