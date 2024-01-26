import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';

import OrmConfig from '../../configs/ormconfig.json';
import { UserModule } from '@/user/user.module';
import { GameModule } from '@/game/game.module';
import { SessionModule } from '@/session/session.module';
import { SocketModule } from '@/socket/socket.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@/auth/auth.module';
import { LoggerMiddleware } from './logger.middleware';
import { StationModule } from '@/playstation/station.module';
import { FavoriteModule } from '@/favorite/favorite.module';

// console.log('OrmConfig: ', OrmConfig);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
    AuthModule,
    UserModule,
    GameModule,
    SessionModule,
    SocketModule,
    StationModule,
    FavoriteModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
