import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AppService } from '../app/app.service';
import { UserService } from '@/user/user.service';
import { User } from '@/user/user.entity';
import { LoginResultDto, UserDto } from '@/user/user.dto';
import { AuthService } from '@/auth/auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('user')
export class UserController {
  private logger = new Logger('UserController');

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Post('/create/auto-generated')
  async createAutoGeneratedUser(
    @Body('nickname') nickname,
  ): Promise<LoginResultDto> {
    const user: User = await this.userService.createAutoGeneratedUser(nickname);
    const result = await this.authService.login(user);
    // this.logger.debug(`created auto generated user: ${user.uid}`);
    return LoginResultDto.from(user, result.access_token);
  }

  @Post('/signout')
  @UseGuards(AuthGuard('jwt'))
  async signout(@Request() req): Promise<void> {
    const uid = req.user.uid;
    const user = await this.userService.getUser(uid);
    if (user.autoGenerated) {
      await this.userService.removeAutoGeneratedUser(uid);
    } else {
      // TODO :: signout
    }
  }
}
