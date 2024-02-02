import { Injectable, Logger } from '@nestjs/common';
import { TenSecondsService } from './ten-seconds.service';
import { PlayStationService } from './station.interface';
import { MafiaService } from './mafia.service';
import { SevenPokerNoChipService } from './seven-poker-nochip.service';

@Injectable()
export class StationRouterService {
  private logger: Logger = new Logger('StationRouterService');

  constructor(
    private tenSecondsService: TenSecondsService,
    private mafiaService: MafiaService,
    private sevenPokerNoChipService: SevenPokerNoChipService,
  ) {}

  getService(gameId: number): PlayStationService<any, any> | null {
    switch (gameId) {
      case 1:
        return this.tenSecondsService;
      case 2:
        return this.mafiaService;
      case 3:
        return this.sevenPokerNoChipService;
      default:
        return null;
    }
  }
}
