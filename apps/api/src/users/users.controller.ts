import { Controller, Get } from '@nestjs/common';
import { Role } from '@lbrtw/shared';
import { Roles } from '../auth/roles.decorator';
import { UsersService } from './users.service';

@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    return {
      success: true,
      data: await this.usersService.findAll()
    };
  }
}
