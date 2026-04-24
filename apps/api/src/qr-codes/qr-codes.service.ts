import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { resolveOrganizationScope } from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQrCodeDto } from './dto/create-qr-code.dto';

const qrListInclude = {
  location: {
    include: {
      organization: true
    }
  }
} satisfies Prisma.QrCodeInclude;

const qrDetailInclude = {
  location: {
    include: {
      organization: true
    }
  }
} satisfies Prisma.QrCodeInclude;

@Injectable()
export class QrCodesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: AuthenticatedUser, requestedOrganizationId?: string) {
    return this.findAllByScope(resolveOrganizationScope(user, requestedOrganizationId));
  }

  findAllForOrganization(organizationId: string) {
    return this.findAllByScope(organizationId);
  }

  private findAllByScope(organizationId?: string) {
    return this.prisma.qrCode.findMany({
      where: this.buildQrWhere(organizationId),
      include: qrListInclude,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const qrCode = await this.prisma.qrCode.findFirst({
      where: {
        id,
        ...this.buildQrWhere(resolveOrganizationScope(user))
      },
      include: qrDetailInclude
    });

    if (!qrCode) {
      throw new NotFoundException('QR code not found');
    }

    return qrCode;
  }

  async findScanLogs(id: string, user: AuthenticatedUser) {
    await this.findOne(id, user);

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

  async create(dto: CreateQrCodeDto, user: AuthenticatedUser) {
    const token = dto.token.trim();
    const label = dto.label.trim();
    const imagePath = this.clean(dto.imagePath) ?? this.defaultImagePath(token);
    const note = this.clean(dto.note);

    if (!token || !label) {
      throw new BadRequestException('QR token and label are required');
    }

    const location = await this.prisma.location.findUnique({
      where: { id: dto.locationId },
      select: {
        id: true,
        organizationId: true
      }
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    resolveOrganizationScope(user, location.organizationId);

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

  async activate(id: string, user: AuthenticatedUser) {
    await this.findOne(id, user);

    return this.prisma.qrCode.update({
      where: { id },
      data: {
        isActive: true,
        deactivatedAt: null
      },
      include: qrDetailInclude
    });
  }

  async deactivate(id: string, user: AuthenticatedUser) {
    await this.findOne(id, user);

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

  private buildQrWhere(organizationId?: string): Prisma.QrCodeWhereInput | undefined {
    if (!organizationId) {
      return undefined;
    }

    return {
      location: {
        organizationId
      }
    };
  }
}
