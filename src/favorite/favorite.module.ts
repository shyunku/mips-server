import { Module } from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { FavoriteController } from './favorite.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorite } from './favorite.entity';
import { User } from '@/user/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Favorite, User])],
  providers: [FavoriteService],
  controllers: [FavoriteController],
})
export class FavoriteModule {}
