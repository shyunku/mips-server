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

  // TODO :: optimize as map
  getUserBySocketId(socketId: string): UserSocket {
    for (const user of this.userMap.values()) {
      if (user.id === socketId) {
        return user;
      }
    }
    return null;
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
  public joinSession(uid: number, sessionId: number) {
    const client = this.getUser(uid);
    if (!client) {
      return;
    }
    this.joinRoom(client, sessionRoom(sessionId));
  }

  public leaveSession(uid: number, sessionId: number) {
    const client = this.getUser(uid);
    if (!client) {
      return;
    }
    this.leaveRoom(client, sessionRoom(sessionId));
  }

  public getSessionClients(sessionId: number): UserSocket[] {
    const room = sessionRoom(sessionId);
    const roomSocketSet: Set<string> = this.io.sockets.adapter.rooms.get(room);
    if (!roomSocketSet) {
      return [];
    }
    const clients: UserSocket[] = [];
    for (const clientId of roomSocketSet) {
      const userSocket = this.getUserBySocketId(clientId);
      if (!userSocket) {
        continue;
      }
      clients.push(userSocket);
    }
    return clients;
  }

  public broadcastToSession(
    sessionId: number,
    topic: string,
    payload: any = null,
  ) {
    this.logger.debug(`Broadcasting --> session ${sessionId} -- ${topic}`);
    this.io.to(sessionRoom(sessionId)).emit(topic, payload);
  }

  public multicastToSession(
    uid: number,
    sessionId: number,
    topic: string,
    payload: any = null,
  ) {
    this.logger.debug(`Multicasting --> session ${sessionId} -- ${topic}`);
    this.io
      .to(sessionRoom(sessionId))
      .except(this.getUser(uid).id)
      .emit(topic, payload);
  }

  public unicastToSession(
    uid: number,
    sessionId: number,
    topic: string,
    payload: any = null,
  ) {
    let ignored = false;
    const targetSocket = this.getUser(uid);
    if (!targetSocket) {
      ignored = true;
    }
    this.logger.debug(
      `Unicasting --> session ${sessionId} -- ${uid} -- ${topic} (${ignored ? 'ignored' : 'sent'})`,
    );
    if (!ignored) {
      this.io.to(this.getUser(uid).id).emit(topic, payload);
    }
  }
}
