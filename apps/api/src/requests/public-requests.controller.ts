import { BadRequestException, Body, Controller, Get, Param, Post, Req, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Public } from '../auth/public.decorator';
import { CreateVisitorRequestDto } from './dto/create-visitor-request.dto';
import {
  MAX_IMAGE_UPLOADS,
  MAX_REQUEST_UPLOAD_BYTES,
  UploadedRequestFiles
} from './request-media-storage.service';
import { RequestsService } from './requests.service';

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
};

type PublicLocation = {
  organization?: {
    id: string;
    name: string;
    code: string;
    type: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  [key: string]: unknown;
};

function getRequestContext(request: RequestLike) {
  const forwardedFor = request.headers?.['x-forwarded-for'];
  const userAgent = request.headers?.['user-agent'];

  return {
    ip: Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor ?? request.ip ?? request.socket?.remoteAddress,
    userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent
  };
}

function requestMediaFileFilter(
  _request: unknown,
  file: { fieldname: string; mimetype: string },
  callback: (error: Error | null, acceptFile: boolean) => void
) {
  const isImageField = file.fieldname === 'images' || file.fieldname === 'image';
  const isAudioField = file.fieldname === 'audio';

  if (isImageField && file.mimetype.startsWith('image/')) {
    callback(null, true);
    return;
  }

  if (isAudioField && file.mimetype.startsWith('audio/')) {
    callback(null, true);
    return;
  }

  callback(new BadRequestException('Desteklenmeyen upload alanı veya dosya tipi'), false);
}

function toPublicLocation(location: PublicLocation) {
  const organization = location.organization;

  return {
    ...location,
    organization: organization
      ? {
          id: organization.id,
          name: organization.name,
          code: organization.code,
          type: organization.type,
          isActive: organization.isActive,
          createdAt: organization.createdAt,
          updatedAt: organization.updatedAt
        }
      : undefined
  };
}

@Public()
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
        location: toPublicLocation(qrCode.location)
      }
    };
  }

  @Post('requests')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: MAX_IMAGE_UPLOADS },
        { name: 'image', maxCount: MAX_IMAGE_UPLOADS },
        { name: 'audio', maxCount: 1 }
      ],
      {
        fileFilter: requestMediaFileFilter,
        limits: {
          fileSize: MAX_REQUEST_UPLOAD_BYTES,
          files: MAX_IMAGE_UPLOADS + 1
        }
      }
    )
  )
  async create(
    @Body() dto: CreateVisitorRequestDto,
    @UploadedFiles() files: UploadedRequestFiles,
    @Req() request: RequestLike
  ) {
    return this.requestsService.createFromPublicQr(dto, getRequestContext(request), files);
  }
}
