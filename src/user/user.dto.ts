import { User } from '@/user/user.entity';

export class UserDto {
  uid: number;
  nickname: string;
  autoGenerated: boolean = true;

  static from(dto: Partial<User>) {
    const user = new UserDto();
    user.uid = dto.uid;
    user.nickname = dto.nickname;
    user.autoGenerated = dto.autoGenerated;
    return user;
  }
}

export class UserSignupDto {
  id: string;
  encryptedPassword: string;
  nickname?: string;
}

export class LoginResultDto {
  user: UserDto;
  token: string;

  static from(user: User, token: string) {
    const dto = new LoginResultDto();
    dto.user = UserDto.from(user);
    dto.token = token;
    return dto;
  }
}
