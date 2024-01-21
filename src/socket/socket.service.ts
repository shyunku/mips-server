import { User } from '@/user/user.entity';
import { Injectable, Logger } from '@nestjs/common';
import { UserSocket } from './socket.middleware';
import { Server } from 'socket.io';
import { sessionRoom } from './socket.dto';

@Injectable()
export class SocketService {
  private logger: Logger = new Logger('SocketService');

  private io: Server;
  private userMap: Map<number, UserSocket> = new Map<number, UserSocket>();

  constructor() {}

  setIo(io: Server) {
    this.io = io;
  }

  addUser(socket: UserSocket) {
    this.userMap.set(socket.user.uid, socket);
  }

  getUser(uid: number): UserSocket {
    return this.userMap.get(uid);
  }

  removeUser(uid: number) {
    this.userMap.delete(uid);
  }

  private joinRoom(client: UserSocket, room: string) {
    client.join(room);
    this.logger.debug(
      `Client (${client.user.uid}) ${client.user.nickname} joined room ${room}`,
    );
  }

  private leaveRoom(client: UserSocket, room: string) {
    client.leave(room);
    this.logger.debug(
      `Client (${client.user.uid}) ${client.user.nickname} left room ${room}`,
    );
  }

  public leaveAllRooms(client: UserSocket) {
    const rooms = Object.keys(client.rooms);
    for (const room of rooms) {
      client.leave(room);
    }
    this.logger.debug(
      `Client (${client.user.uid}) ${client.user.nickname} left all (${rooms.length}) rooms`,
    );
  }

  public joinSession(uid: number, sessionId: number) {
    const client = this.getUser(uid);
    if (!client) {
      return;
    }
    this.joinRoom(client, sessionRoom(sessionId));
  }

  public broadcast(topic: string, payload: any) {
    this.io.emit(topic, payload);
  }

  private broadcastToRoom(room: string, topic: string, payload: any) {
    this.io.to(room).emit(topic, payload);
  }

  // broadcast except sender
  private multicastToRoom(
    uid: number,
    room: string,
    topic: string,
    payload: any,
  ) {
    this.io.to(room).except(this.getUser(uid).id).emit(topic, payload);
  }

  /* ---------------------- Session ---------------------- */
  public broadcastToSession(sessionId: number, topic: string, payload: any) {
    this.logger.debug(`Broadcasting --> session ${sessionId} -- ${topic}`);
    this.io.to(sessionRoom(sessionId)).emit(topic, payload);
  }

  public multicastToSession(
    uid: number,
    sessionId: number,
    topic: string,
    payload: any,
  ) {
    this.logger.debug(`Multicasting --> session ${sessionId} -- ${topic}`);
    this.io
      .to(sessionRoom(sessionId))
      .except(this.getUser(uid).id)
      .emit(topic, payload);
  }
}