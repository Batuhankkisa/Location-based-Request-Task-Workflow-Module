import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@lbrtw/shared';
import { Roles } from '../auth/roles.decorator';
import { CreateQrCodeDto } from './dto/create-qr-code.dto';
import { QrCodesService } from './qr-codes.service';

@Roles(Role.ADMIN, Role.SUPERVISOR)
@Controller('qr-codes')
export class QrCodesController {
  constructor(private readonly qrCodesService: QrCodesService) {}

  @Get()
  async findAll() {
    return {
      success: true,
      data: await this.qrCodesService.findAll()
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return {
      success: true,
      data: await this.qrCodesService.findOne(id)
    };
  }

  @Get(':id/scan-logs')
  async findScanLogs(@Param('id') id: string) {
    return {
      success: true,
      data: await this.qrCodesService.findScanLogs(id)
    };
  }

  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateQrCodeDto) {
    return {
      success: true,
      data: await this.qrCodesService.create(dto)
    };
  }

  @Roles(Role.ADMIN)
  @Patch(':id/activate')
  async activate(@Param('id') id: string) {
    return {
      success: true,
      data: await this.qrCodesService.activate(id)
    };
  }

  @Roles(Role.ADMIN)
  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return {
      success: true,
      data: await this.qrCodesService.deactivate(id)
    };
  }
}
