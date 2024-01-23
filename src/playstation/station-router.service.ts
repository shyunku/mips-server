import { Injectable, Logger } from '@nestjs/common';
import { TenSecondsService } from './ten-seconds.service';
import { PlayStationService } from './station.interface';

@Injectable()
export class StationRouterService {
  private logger: Logger = new Logger('StationRouterService');

  constructor(private tenSecondsService: TenSecondsService) {}

  getService(gameId: number): PlayStationService | null {
    switch (gameId) {
      case 1:
        return this.tenSecondsService;
      default:
        return null;
    }
  }
}
