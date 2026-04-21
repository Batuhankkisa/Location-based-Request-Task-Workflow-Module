import { Body, Controller, Get, Post } from '@nestjs/common';
import { Role } from '@lbrtw/shared';
import { Roles } from '../auth/roles.decorator';
import { CreateLocationDto } from './dto/create-location.dto';
import { LocationsService } from './locations.service';

@Roles(Role.ADMIN, Role.SUPERVISOR)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('tree')
  async tree() {
    return {
      success: true,
      data: await this.locationsService.findTree()
    };
  }

  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateLocationDto) {
    return {
      success: true,
      data: await this.locationsService.create(dto)
    };
  }
}
