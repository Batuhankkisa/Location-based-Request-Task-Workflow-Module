import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestChannel } from '@lbrtw/shared';
import {
  Prisma,
  QrScanStatus,
  RequestMediaType,
  RequestChannel as PrismaRequestChannel,
  TaskStatus as PrismaTaskStatus
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVisitorRequestDto } from './dto/create-visitor-request.dto';
import {
  RequestMediaStorageService,
  StoredRequestMedia,
  UploadedRequestFiles
} from './request-media-storage.service';

type RequestContext = {
  ip?: string;
  userAgent?: string;
};

const qrWithLocation = Prisma.validator<Prisma.QrCodeDefaultArgs>()({
  include: {
    location: {
      include: {
        organization: true
      }
    }
  }
});

type QrWithLocation = Prisma.QrCodeGetPayload<typeof qrWithLocation>;

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly requestMediaStorageService: RequestMediaStorageService
  ) {}

  async resolveQrToken(token: string, context: RequestContext = {}) {
    const cleanToken = token.trim();
    const qrCode = await this.prisma.qrCode.findUnique({
      where: { token: cleanToken },
      include: {
        location: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!qrCode) {
      await this.logUnknownToken(cleanToken, context, 'QR token not found');
      throw new NotFoundException('QR code not found or inactive');
    }

    if (!qrCode.isActive || !qrCode.location.organization.isActive) {
      await this.logQrScan(
        qrCode,
        QrScanStatus.INACTIVE,
        context,
        !qrCode.isActive ? 'QR code is inactive' : 'Organization is inactive'
      );
      throw new NotFoundException('QR code not found or inactive');
    }

    const scanLog = await this.logQrScan(qrCode, QrScanStatus.RESOLVED, context);

    return {
      ...qrCode,
      scanLogId: scanLog.id
    };
  }

  async createFromPublicQr(
    dto: CreateVisitorRequestDto,
    context: RequestContext = {},
    files?: UploadedRequestFiles
  ) {
    const token = dto.token.trim();
    const requestText = this.clean(dto.requestText);
    const transcriptText = this.clean(dto.transcriptText);
    const hasUploadedFiles = this.requestMediaStorageService.hasFiles(files);

    if (!token) {
      throw new BadRequestException('QR token is required');
    }

    if (!requestText && !transcriptText && !hasUploadedFiles) {
      throw new BadRequestException('Talep metni, transcript, ses kaydı veya fotoğraf zorunludur');
    }

    const qrCode = await this.prisma.qrCode.findUnique({
      where: { token },
      include: {
        location: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!qrCode) {
      await this.logUnknownToken(token, context, 'Request failed because QR token was not found');
      throw new NotFoundException('QR code not found or inactive');
    }

    if (!qrCode.isActive || !qrCode.location.organization.isActive) {
      await this.logQrScan(
        qrCode,
        QrScanStatus.REQUEST_FAILED,
        context,
        !qrCode.isActive
          ? 'Request failed because QR code is inactive'
          : 'Request failed because organization is inactive'
      );
      throw new NotFoundException('QR code not found or inactive');
    }

    const channel = (dto.channel ?? RequestChannel.QR_WEB) as PrismaRequestChannel;
    const scanLogId = this.clean(dto.scanLogId) ?? (await this.logQrScan(qrCode, QrScanStatus.RESOLVED, context)).id;
    const storedMedia = await this.requestMediaStorageService.store(files);
    const finalRequestText = requestText ?? transcriptText ?? this.buildMediaOnlyRequestText(storedMedia);
    const audioMedia = storedMedia.find((media) => media.type === RequestMediaType.AUDIO);

    const result = await this.prisma.$transaction(async (tx) => {
      const visitorRequest = await tx.visitorRequest.create({
        data: {
          qrCodeId: qrCode.id,
          locationId: qrCode.locationId,
          requestText: finalRequestText,
          transcriptText,
          audioFileUrl: audioMedia?.fileUrl,
          channel,
          media: {
            create: storedMedia.map((media) => ({
              type: media.type,
              fileUrl: media.fileUrl,
              storageKey: media.storageKey,
              mimeType: media.mimeType,
              fileSize: media.fileSize,
              originalName: media.originalName
            }))
          }
        }
      });

      const task = await tx.task.create({
        data: {
          requestId: visitorRequest.id,
          locationId: qrCode.locationId,
          status: PrismaTaskStatus.NEW
        }
      });

      await tx.taskHistory.create({
        data: {
          taskId: task.id,
          fromStatus: null,
          toStatus: PrismaTaskStatus.NEW,
          note: 'Task created from public QR request',
          changedBy: 'visitor'
        }
      });

      const updateResult = await tx.qrScanLog.updateMany({
        where: {
          id: scanLogId,
          qrCodeId: qrCode.id
        },
        data: {
          requestId: visitorRequest.id,
          createdTaskId: task.id,
          status: QrScanStatus.REQUEST_CREATED
        }
      });

      if (updateResult.count === 0) {
        await tx.qrCode.update({
          where: { id: qrCode.id },
          data: {
            lastScannedAt: new Date(),
            scanCount: { increment: 1 }
          }
        });

        await tx.qrScanLog.create({
          data: {
            qrCodeId: qrCode.id,
            tokenSnapshot: qrCode.token,
            ip: context.ip,
            userAgent: context.userAgent,
            resolvedLocationId: qrCode.locationId,
            requestId: visitorRequest.id,
            createdTaskId: task.id,
            status: QrScanStatus.REQUEST_CREATED
          }
        });
      }

      return { visitorRequest, task };
    });

    await this.notificationsService.notifyTaskCreated({
      taskId: result.task.id,
      locationName: qrCode.location.name,
      requestText: finalRequestText
    });

    return {
      success: true,
      requestId: result.visitorRequest.id,
      taskId: result.task.id
    };
  }

  private async logQrScan(
    qrCode: QrWithLocation,
    status: QrScanStatus,
    context: RequestContext,
    errorMessage?: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.qrCode.update({
        where: { id: qrCode.id },
        data: {
          lastScannedAt: new Date(),
          scanCount: { increment: 1 }
        }
      });

      return tx.qrScanLog.create({
        data: {
          qrCodeId: qrCode.id,
          tokenSnapshot: qrCode.token,
          ip: context.ip,
          userAgent: context.userAgent,
          resolvedLocationId: qrCode.locationId,
          status,
          errorMessage
        }
      });
    });
  }

  private async logUnknownToken(token: string, context: RequestContext, errorMessage: string) {
    await this.prisma.qrScanLog.create({
      data: {
        tokenSnapshot: token || '(empty)',
        ip: context.ip,
        userAgent: context.userAgent,
        status: QrScanStatus.TOKEN_NOT_FOUND,
        errorMessage
      }
    });
  }

  private clean(value?: string): string | undefined {
    const cleanValue = value?.trim();
    return cleanValue ? cleanValue : undefined;
  }

  private buildMediaOnlyRequestText(media: StoredRequestMedia[]) {
    const imageCount = media.filter((item) => item.type === RequestMediaType.IMAGE).length;
    const hasAudio = media.some((item) => item.type === RequestMediaType.AUDIO);

    if (imageCount > 0 && hasAudio) {
      return 'Fotoğraf ve ses kaydı ile talep oluşturuldu';
    }

    if (imageCount > 0) {
      return 'Fotoğraf ile talep oluşturuldu';
    }

    return 'Ses kaydı ile talep oluşturuldu';
  }
}
