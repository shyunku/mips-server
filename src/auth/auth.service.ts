import { User } from '@/user/user.entity';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(user: User) {
    if (user.uid == null) throw new Error('user.uid is null');
    const payload = { uid: user.uid, nickname: user.nickname };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  validate(token: string): JwtPayload {
    const payload = this.jwtService.verify(token);
    return new JwtPayload(payload.uid, payload.nickname);
  }
}
