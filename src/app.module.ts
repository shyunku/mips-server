import { Module } from '@nestjs/common';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { TypeOrmModule } from '@nestjs/typeorm';

import OrmConfig from '../configs/ormconfig.json';
import { UserModule } from './modules/user.module';
import { GameModule } from './modules/game.module';

// console.log('OrmConfig: ', OrmConfig);

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: OrmConfig.host,
      port: OrmConfig.port,
      username: OrmConfig.username,
      password: OrmConfig.password,
      database: OrmConfig.database,
      entities: OrmConfig.entities,
      synchronize: OrmConfig.synchronize,
    }),
    UserModule,
    GameModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
