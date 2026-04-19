import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LocationType as PrismaLocationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';

type LocationWithQrCodes = Prisma.LocationGetPayload<{
  include: {
    qrCodes: {
      select: {
        id: true;
        token: true;
        label: true;
        isActive: true;
        createdAt: true;
      };
    };
  };
}>;

export type LocationTreeNode = LocationWithQrCodes & {
  children: LocationTreeNode[];
};

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findTree(): Promise<LocationTreeNode[]> {
    const locations = await this.prisma.location.findMany({
      include: {
        qrCodes: {
          select: {
            id: true,
            token: true,
            label: true,
            isActive: true,
            createdAt: true
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const nodes = new Map<string, LocationTreeNode>();
    for (const location of locations) {
      nodes.set(location.id, { ...location, children: [] });
    }

    const roots: LocationTreeNode[] = [];
    for (const node of nodes.values()) {
      if (node.parentId && nodes.has(node.parentId)) {
        nodes.get(node.parentId)?.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async create(dto: CreateLocationDto) {
    const name = dto.name.trim();
    const code = dto.code.trim();

    if (!name || !code) {
      throw new BadRequestException('Location name and code are required');
    }

    if (dto.parentId) {
      const parent = await this.prisma.location.findUnique({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException('Parent location not found');
      }
    }

    try {
      return await this.prisma.location.create({
        data: {
          name,
          code,
          type: dto.type as PrismaLocationType,
          parentId: dto.parentId
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Location code already exists');
      }

      throw error;
    }
  }
}
