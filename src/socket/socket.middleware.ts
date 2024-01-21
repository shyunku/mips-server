import { AuthService } from '@/auth/auth.service';
import { JwtPayload } from '@/auth/jwt.strategy';
import { User } from '@/user/user.entity';
import { UserService } from '@/user/user.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

export interface UserSocket extends Socket {
  user: User;
}

export type SocketMiddleware = (
  socket: Socket,
  next: (err?: Error) => void,
) => void;

export const WSAuthMiddleware = (
  authService: AuthService,
  userService: UserService,
): SocketMiddleware => {
  return async (socket: UserSocket, next) => {
    try {
      const jwtPayload = authService.validate(
        socket.handshake.auth.token ?? '',
      ) as JwtPayload;
      const userResult: User = await userService.getUser(jwtPayload.uid);
      if (userResult != null) {
        socket.user = userResult;
        next();
      } else {
        throw new Error();
      }
    } catch (error) {
      next(new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED));
    }
  };
};
