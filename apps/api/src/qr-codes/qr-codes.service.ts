import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQrCodeDto } from './dto/create-qr-code.dto';

@Injectable()
export class QrCodesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQrCodeDto) {
    const token = dto.token.trim();
    const label = dto.label.trim();

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
}
