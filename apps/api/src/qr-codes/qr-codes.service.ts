import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQrCodeDto } from './dto/create-qr-code.dto';

const qrListInclude = {
  location: true
} satisfies Prisma.QrCodeInclude;

const qrDetailInclude = {
  location: true
} satisfies Prisma.QrCodeInclude;

@Injectable()
export class QrCodesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.qrCode.findMany({
      include: qrListInclude,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const qrCode = await this.prisma.qrCode.findUnique({
      where: { id },
      include: qrDetailInclude
    });

    if (!qrCode) {
      throw new NotFoundException('QR code not found');
    }

    return qrCode;
  }

  async findScanLogs(id: string) {
    await this.findOne(id);

    return this.prisma.qrScanLog.findMany({
      where: { qrCodeId: id },
      include: {
        resolvedLocation: true,
        request: true,
        createdTask: true
      },
      orderBy: { scannedAt: 'desc' },
      take: 100
    });
  }

  async create(dto: CreateQrCodeDto) {
    const token = dto.token.trim();
    const label = dto.label.trim();
    const imagePath = this.clean(dto.imagePath) ?? this.defaultImagePath(token);
    const note = this.clean(dto.note);

    if (!token || !label) {
      throw new BadRequestException('QR token and label are required');
    }

    const location = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    try {
      return await this.prisma.qrCode.create({
        data: {
          token,
          label,
          isActive: dto.isActive ?? true,
          deactivatedAt: dto.isActive === false ? new Date() : null,
          imagePath,
          note,
          locationId: location.id
        },
        include: { location: true }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('QR token already exists');
      }

      throw error;
    }
  }

  async activate(id: string) {
    await this.findOne(id);

    return this.prisma.qrCode.update({
      where: { id },
      data: {
        isActive: true,
        deactivatedAt: null
      },
      include: qrDetailInclude
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);

    return this.prisma.qrCode.update({
      where: { id },
      data: {
        isActive: false,
        deactivatedAt: new Date()
      },
      include: qrDetailInclude
    });
  }

  private defaultImagePath(token: string) {
    return `/qr-assets/${token}.png`;
  }

  private clean(value?: string): string | undefined {
    const cleanValue = value?.trim();
    return cleanValue ? cleanValue : undefined;
  }
}
