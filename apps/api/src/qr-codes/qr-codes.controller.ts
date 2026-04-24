import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@lbrtw/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { CreateQrCodeDto } from './dto/create-qr-code.dto';
import { QrCodesService } from './qr-codes.service';

@Roles(Role.ADMIN, Role.SUPERVISOR)
@Controller('qr-codes')
export class QrCodesController {
  constructor(private readonly qrCodesService: QrCodesService) {}

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId') organizationId?: string
  ) {
    return {
      success: true,
      data: await this.qrCodesService.findAll(user, organizationId)
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      data: await this.qrCodesService.findOne(id, user)
    };
  }

  @Get(':id/scan-logs')
  async findScanLogs(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      data: await this.qrCodesService.findScanLogs(id, user)
    };
  }

  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Post()
  async create(@Body() dto: CreateQrCodeDto, @CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      data: await this.qrCodesService.create(dto, user)
    };
  }

  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Patch(':id/activate')
  async activate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      data: await this.qrCodesService.activate(id, user)
    };
  }

  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      data: await this.qrCodesService.deactivate(id, user)
    };
  }
}
