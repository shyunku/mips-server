import { Injectable, Logger } from '@nestjs/common';
import { TenSecondsService } from './ten-seconds.service';
import { PlayStationService } from './station.interface';
import { MafiaService } from './mafia.service';

@Injectable()
export class StationRouterService {
  private logger: Logger = new Logger('StationRouterService');

  constructor(
    private tenSecondsService: TenSecondsService,
    private mafiaService: MafiaService,
  ) {}

  getService(gameId: number): PlayStationService<any, any> | null {
    switch (gameId) {
      case 1:
        return this.tenSecondsService;
      case 2:
        return this.mafiaService;
      default:
        return null;
    }
  }
}
