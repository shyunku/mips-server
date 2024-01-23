import { UserService } from '@/user/user.service';
import { Inject, Logger, UseGuards, forwardRef } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { UserSocket, WSAuthMiddleware } from './socket.middleware';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '@/auth/auth.service';
import { SocketService } from './socket.service';
import { SessionService } from '@/session/session.service';
import { SOCKET_TOPICS, sessionRoom } from './socket.dto';
import { StationRouterService } from '@/playstation/station-router.service';

@WebSocketGateway(8101, {
  cors: { origin: ['*'] },
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private logger: Logger = new Logger('SocketGateway');
  @WebSocketServer() server: Server;

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    @Inject(forwardRef(() => SessionService))
    private readonly sessionService: SessionService,
    private readonly socketService: SocketService,
    private readonly stationRouterService: StationRouterService,
  ) {}

  afterInit(server: Server) {
    const middleware = WSAuthMiddleware(this.authService, this.userService);
    server.use(middleware);
    this.logger.log('socket server initialized!');
    this.socketService.setIo(server);
  }

  async handleConnection(client: UserSocket, ...args: any[]) {
    this.logger.log(
      `Client connected: (${client.user.uid}) ${client.user.nickname}`,
    );
    this.socketService.addUser(client);

    // load user's active sessions
    const activeSessions = await this.sessionService.getActiveSessions(
      client.user.uid,
    );
    for (const session of activeSessions) {
      this.socketService.joinSession(client.user.uid, session.id);
    }
  }

  handleDisconnect(client: UserSocket) {
    this.logger.log(
      `Client disconnected: (${client.user.uid}) ${client.user.nickname}`,
    );
    this.socketService.leaveAllRooms(client);
    this.socketService.removeUser(client.user.uid);
  }

  @SubscribeMessage('message')
  handleMessage(client: UserSocket, payload: any): string {
    client.emit('message', payload);
    return 'Hello world!';
  }

  @SubscribeMessage(SOCKET_TOPICS.SESSION_INGAME)
  async handleSessionIngame(
    client: UserSocket,
    raw: [sessionId: number, topic: string, payload: any],
  ): Promise<void> {
    try {
      const [sessionId, topic, payload] = raw;
      this.logger.debug(
        `Client (${client.user.uid}) ${client.user.nickname} -> ${sessionId}: ${topic}`,
      );
      const session = await this.sessionService.getSession(sessionId);
      if (!session) return;
      const uid = client.user.uid;
      if (!uid) return;
      if (session.game.gid == null) return;

      const gameService = this.stationRouterService.getService(
        session.game.gid,
      );
      if (gameService == null) return;
      const isCreator = session.creator.uid === uid;
      gameService.routeMessage(sessionId, uid, isCreator, topic, payload);
    } catch (e) {
      this.logger.error(e);
    }
  }
}
