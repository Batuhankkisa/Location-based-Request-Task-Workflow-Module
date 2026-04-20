import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestChannel } from '@lbrtw/shared';
import { RequestChannel as PrismaRequestChannel, TaskStatus as PrismaTaskStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVisitorRequestDto } from './dto/create-visitor-request.dto';

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}

  async resolveQrToken(token: string) {
    const cleanToken = token.trim();
    const qrCode = await this.prisma.qrCode.findUnique({
      where: { token: cleanToken },
      include: { location: true }
    });

    if (!qrCode || !qrCode.isActive) {
      throw new NotFoundException('QR code not found or inactive');
    }

    return qrCode;
  }

  async createFromPublicQr(dto: CreateVisitorRequestDto) {
    const token = dto.token.trim();
    const requestText = dto.requestText.trim();

    if (!token) {
      throw new BadRequestException('QR token is required');
    }

    if (!requestText) {
      throw new BadRequestException('Request text cannot be empty');
    }

    const qrCode = await this.resolveQrToken(token);
    const channel = (dto.channel ?? RequestChannel.QR_WEB) as PrismaRequestChannel;

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
}
