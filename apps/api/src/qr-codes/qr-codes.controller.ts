import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateQrCodeDto } from './dto/create-qr-code.dto';
import { QrCodesService } from './qr-codes.service';

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

  @Post()
  async create(@Body() dto: CreateQrCodeDto) {
    return {
      success: true,
      data: await this.qrCodesService.create(dto)
    };
  }

  @Patch(':id/activate')
  async activate(@Param('id') id: string) {
    return {
      success: true,
      data: await this.qrCodesService.activate(id)
    };
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return {
      success: true,
      data: await this.qrCodesService.deactivate(id)
    };
  }
}
