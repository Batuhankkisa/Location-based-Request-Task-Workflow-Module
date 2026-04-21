import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return {
      success: true,
      data: await this.authService.login(dto.email, dto.password)
    };
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      data: user
    };
  }
}
