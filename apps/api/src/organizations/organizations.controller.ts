import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@lbrtw/shared';
import { LocationsService } from '../locations/locations.service';
import { QrCodesService } from '../qr-codes/qr-codes.service';
import { TasksService } from '../tasks/tasks.service';
import { Roles } from '../auth/roles.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@Roles(Role.ADMIN)
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly locationsService: LocationsService,
    private readonly qrCodesService: QrCodesService,
    private readonly tasksService: TasksService
  ) {}

  @Get()
  async findAll() {
    return {
      success: true,
      data: await this.organizationsService.findAll()
    };
  }

  @Post()
  async create(@Body() dto: CreateOrganizationDto) {
    return {
      success: true,
      data: await this.organizationsService.create(dto)
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return {
      success: true,
      data: await this.organizationsService.findOne(id)
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return {
      success: true,
      data: await this.organizationsService.update(id, dto)
    };
  }

  @Get(':id/locations/tree')
  async findLocationTree(@Param('id') id: string) {
    await this.organizationsService.ensureExists(id);

    return {
      success: true,
      data: await this.locationsService.findTreeForOrganization(id)
    };
  }

  @Get(':id/qrs')
  async findQrCodes(@Param('id') id: string) {
    await this.organizationsService.ensureExists(id);

    return {
      success: true,
      data: await this.qrCodesService.findAllForOrganization(id)
    };
  }

  @Get(':id/tasks')
  async findTasks(@Param('id') id: string) {
    await this.organizationsService.ensureExists(id);

    return {
      success: true,
      data: await this.tasksService.findAllForOrganization(id)
    };
  }
}
