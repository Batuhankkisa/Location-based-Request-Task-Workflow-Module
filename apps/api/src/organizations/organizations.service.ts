import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LocationType, OrganizationType as PrismaOrganizationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

const organizationListSelect = Prisma.validator<Prisma.OrganizationDefaultArgs>()({
  select: {
    id: true,
    name: true,
    code: true,
    type: true,
    isActive: true,
    telegramEnabled: true,
    telegramChatId: true,
    telegramNotificationThreadId: true,
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        users: true,
        locations: true
      }
    }
  }
});

const organizationDetailSelect = Prisma.validator<Prisma.OrganizationDefaultArgs>()({
  select: {
    id: true,
    name: true,
    code: true,
    type: true,
    isActive: true,
    telegramEnabled: true,
    telegramChatId: true,
    telegramNotificationThreadId: true,
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        users: true,
        locations: true
      }
    },
    locations: {
      where: {
        parentId: null,
        type: LocationType.ORGANIZATION
      },
      take: 1,
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        createdAt: true
      }
    }
  }
});

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.organization.findMany({
      ...organizationListSelect,
      orderBy: { createdAt: 'asc' }
    });
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      ...organizationDetailSelect
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async create(dto: CreateOrganizationDto) {
    const name = dto.name.trim();
    const code = dto.code.trim().toUpperCase();

    if (!name || !code) {
      throw new BadRequestException('Organization name and code are required');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name,
            code,
            type: dto.type,
            isActive: dto.isActive ?? true,
            telegramEnabled: dto.telegramEnabled ?? false,
            telegramChatId: this.cleanNullable(dto.telegramChatId),
            telegramNotificationThreadId: this.cleanNullable(dto.telegramNotificationThreadId)
          }
        });

        await tx.location.create({
          data: {
            organizationId: organization.id,
            name,
            code,
            type: LocationType.ORGANIZATION,
            parentId: null
          }
        });

        return tx.organization.findUnique({
          where: { id: organization.id },
          ...organizationDetailSelect
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Organization code already exists');
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.ensureExists(id);

    const data: Prisma.OrganizationUpdateInput = {};
    if (typeof dto.name === 'string') {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException('Organization name cannot be empty');
      }

      data.name = name;
    }

    if (typeof dto.code === 'string') {
      const code = dto.code.trim().toUpperCase();
      if (!code) {
        throw new BadRequestException('Organization code cannot be empty');
      }

      data.code = code;
    }

    if (dto.type) {
      data.type = dto.type as PrismaOrganizationType;
    }

    if (typeof dto.isActive === 'boolean') {
      data.isActive = dto.isActive;
    }

    if (typeof dto.telegramEnabled === 'boolean') {
      data.telegramEnabled = dto.telegramEnabled;
    }

    if (typeof dto.telegramChatId === 'string') {
      data.telegramChatId = this.cleanNullable(dto.telegramChatId);
    }

    if (typeof dto.telegramNotificationThreadId === 'string') {
      data.telegramNotificationThreadId = this.cleanNullable(dto.telegramNotificationThreadId);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.update({
          where: { id },
          data
        });

        const rootLocationUpdate: Prisma.LocationUpdateManyMutationInput = {};
        if (typeof data.name === 'string') {
          rootLocationUpdate.name = data.name;
        }

        if (typeof data.code === 'string') {
          rootLocationUpdate.code = data.code;
        }

        if (Object.keys(rootLocationUpdate).length > 0) {
          await tx.location.updateMany({
            where: {
              organizationId: id,
              parentId: null,
              type: LocationType.ORGANIZATION
            },
            data: rootLocationUpdate
          });
        }

        return tx.organization.findUnique({
          where: { id: organization.id },
          ...organizationDetailSelect
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Organization code already exists');
      }

      throw error;
    }
  }

  async ensureExists(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  private cleanNullable(value?: string) {
    const cleanValue = value?.trim();
    return cleanValue ? cleanValue : null;
  }
}
