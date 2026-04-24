import { Body, Controller, Get, Patch, Post, Query, Param } from '@nestjs/common';
import { Role } from '@lbrtw/shared';
import { Roles } from '../auth/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query('organizationId') organizationId?: string) {
    return {
      success: true,
      data: await this.usersService.findAll(organizationId)
    };
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return {
      success: true,
      data: await this.usersService.create(dto)
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return {
      success: true,
      data: await this.usersService.update(id, dto)
    };
  }
}
