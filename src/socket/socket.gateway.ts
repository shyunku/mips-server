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
import { sessionRoom } from './socket.dto';

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
    console.log(payload);
    client.emit('message', payload);
    return 'Hello world!';
  }
}
