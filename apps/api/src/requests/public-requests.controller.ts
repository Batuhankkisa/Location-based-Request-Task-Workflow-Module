import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { CreateVisitorRequestDto } from './dto/create-visitor-request.dto';
import { RequestsService } from './requests.service';

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
};

function getRequestContext(request: RequestLike) {
  const forwardedFor = request.headers?.['x-forwarded-for'];
  const userAgent = request.headers?.['user-agent'];

  return {
    ip: Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor ?? request.ip ?? request.socket?.remoteAddress,
    userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent
  };
}

@Controller('public')
export class PublicRequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get('qr/:token')
  async resolveQr(@Param('token') token: string, @Req() request: RequestLike) {
    const qrCode = await this.requestsService.resolveQrToken(token, getRequestContext(request));

    return {
      success: true,
      data: {
        id: qrCode.id,
        token: qrCode.token,
        label: qrCode.label,
        imagePath: qrCode.imagePath,
        scanLogId: qrCode.scanLogId,
        location: qrCode.location
      }
    };
  }

  @Post('requests')
  async create(@Body() dto: CreateVisitorRequestDto, @Req() request: RequestLike) {
    return this.requestsService.createFromPublicQr(dto, getRequestContext(request));
  }
}
