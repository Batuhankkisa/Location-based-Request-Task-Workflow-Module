import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateVisitorRequestDto } from './dto/create-visitor-request.dto';
import { RequestsService } from './requests.service';

@Controller('public')
export class PublicRequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get('qr/:token')
  async resolveQr(@Param('token') token: string) {
    const qrCode = await this.requestsService.resolveQrToken(token);

    return {
      success: true,
      data: {
        id: qrCode.id,
        token: qrCode.token,
        label: qrCode.label,
        location: qrCode.location
      }
    };
  }

  @Post('requests')
  async create(@Body() dto: CreateVisitorRequestDto) {
    return this.requestsService.createFromPublicQr(dto);
  }
}
