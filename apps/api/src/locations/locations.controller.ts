import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Role } from '@lbrtw/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { CreateLocationDto } from './dto/create-location.dto';
import { LocationsService } from './locations.service';

@Roles(Role.ADMIN, Role.SUPERVISOR)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('tree')
  async tree(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId') organizationId?: string
  ) {
    return {
      success: true,
      data: await this.locationsService.findTree(user, organizationId)
    };
  }

  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Post()
  async create(@Body() dto: CreateLocationDto, @CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      data: await this.locationsService.create(dto, user)
    };
  }
}
