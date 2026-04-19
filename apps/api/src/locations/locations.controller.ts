import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateLocationDto } from './dto/create-location.dto';
import { LocationsService } from './locations.service';

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

  @Post()
  async create(@Body() dto: CreateLocationDto) {
    return {
      success: true,
      data: await this.locationsService.create(dto)
    };
  }
}
