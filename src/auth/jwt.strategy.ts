import { UserService } from '@/user/user.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';

export class JwtPayload {
  uid: number;
  nickname: string;

  constructor(uid: number, nickname: string) {
    this.uid = uid;
    this.nickname = nickname;
  }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    if (payload.uid == null)
      throw new UnauthorizedException('Invalid token: uid not found');
    const user = await this.userService.getUser(payload.uid);
    if (user == null)
      throw new UnauthorizedException('Invalid token: user not found');
    return new JwtPayload(payload.uid, payload.nickname);
  }
}
