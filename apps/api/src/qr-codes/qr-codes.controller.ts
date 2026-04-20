import { Body, Controller, Post } from '@nestjs/common';
import { CreateQrCodeDto } from './dto/create-qr-code.dto';
import { QrCodesService } from './qr-codes.service';

@Controller('qr-codes')
export class QrCodesController {
  constructor(private readonly qrCodesService: QrCodesService) {}

  @Post()
  async create(@Body() dto: CreateQrCodeDto) {
    return {
      success: true,
      data: await this.qrCodesService.create(dto)
    };
  }
}
