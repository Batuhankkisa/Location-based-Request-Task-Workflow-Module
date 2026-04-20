import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestChannel } from '@lbrtw/shared';
import {
  Prisma,
  QrScanStatus,
  RequestChannel as PrismaRequestChannel,
  TaskStatus as PrismaTaskStatus
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVisitorRequestDto } from './dto/create-visitor-request.dto';

type RequestContext = {
  ip?: string;
  userAgent?: string;
};

const qrWithLocation = Prisma.validator<Prisma.QrCodeDefaultArgs>()({
  include: { location: true }
});

type QrWithLocation = Prisma.QrCodeGetPayload<typeof qrWithLocation>;

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}

  async resolveQrToken(token: string, context: RequestContext = {}) {
    const cleanToken = token.trim();
    const qrCode = await this.prisma.qrCode.findUnique({
      where: { token: cleanToken },
      include: { location: true }
    });

    if (!qrCode) {
      await this.logUnknownToken(cleanToken, context, 'QR token not found');
      throw new NotFoundException('QR code not found or inactive');
    }

    if (!qrCode.isActive) {
      await this.logQrScan(qrCode, QrScanStatus.INACTIVE, context, 'QR code is inactive');
      throw new NotFoundException('QR code not found or inactive');
    }

    const scanLog = await this.logQrScan(qrCode, QrScanStatus.RESOLVED, context);

    return {
      ...qrCode,
      scanLogId: scanLog.id
    };
  }

  async createFromPublicQr(dto: CreateVisitorRequestDto, context: RequestContext = {}) {
    const token = dto.token.trim();
    const requestText = dto.requestText.trim();

    if (!token) {
      throw new BadRequestException('QR token is required');
    }

    if (!requestText) {
      throw new BadRequestException('Request text cannot be empty');
    }

    const qrCode = await this.prisma.qrCode.findUnique({
      where: { token },
      include: { location: true }
    });

    if (!qrCode) {
      await this.logUnknownToken(token, context, 'Request failed because QR token was not found');
      throw new NotFoundException('QR code not found or inactive');
    }

    if (!qrCode.isActive) {
      await this.logQrScan(qrCode, QrScanStatus.REQUEST_FAILED, context, 'Request failed because QR code is inactive');
      throw new NotFoundException('QR code not found or inactive');
    }

    const channel = (dto.channel ?? RequestChannel.QR_WEB) as PrismaRequestChannel;
    const scanLogId = this.clean(dto.scanLogId) ?? (await this.logQrScan(qrCode, QrScanStatus.RESOLVED, context)).id;

    const result = await this.prisma.$transaction(async (tx) => {
      const visitorRequest = await tx.visitorRequest.create({
        data: {
          qrCodeId: qrCode.id,
          locationId: qrCode.locationId,
          requestText,
          channel
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
      requestText
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
}
