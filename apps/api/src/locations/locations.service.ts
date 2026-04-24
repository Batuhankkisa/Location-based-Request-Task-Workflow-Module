import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LocationType as PrismaLocationType, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { resolveOrganizationScope } from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';

type LocationWithQrCodes = Prisma.LocationGetPayload<{
  include: {
    organization: {
      select: {
        id: true;
        name: true;
        code: true;
        type: true;
        isActive: true;
      };
    };
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

  async findTree(user: AuthenticatedUser, requestedOrganizationId?: string): Promise<LocationTreeNode[]> {
    return this.findTreeByOrganization(resolveOrganizationScope(user, requestedOrganizationId));
  }

  async findTreeForOrganization(organizationId: string): Promise<LocationTreeNode[]> {
    return this.findTreeByOrganization(organizationId);
  }

  private async findTreeByOrganization(organizationId?: string): Promise<LocationTreeNode[]> {
    const locations = await this.prisma.location.findMany({
      where: organizationId
        ? {
            organizationId
          }
        : undefined,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            isActive: true
          }
        },
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

  async create(dto: CreateLocationDto, user: AuthenticatedUser) {
    const name = dto.name.trim();
    const code = dto.code.trim();

    if (!name || !code) {
      throw new BadRequestException('Location name and code are required');
    }

    if (dto.type === PrismaLocationType.ORGANIZATION) {
      throw new BadRequestException('Organization root locations are managed from /organizations');
    }

    if (!dto.parentId?.trim()) {
      throw new BadRequestException('Parent location is required for creating nested locations');
    }

    let organizationId = dto.organizationId?.trim();

    if (dto.parentId) {
      const parent = await this.prisma.location.findUnique({
        where: { id: dto.parentId },
        select: {
          id: true,
          organizationId: true
        }
      });

      if (!parent) {
        throw new NotFoundException('Parent location not found');
      }

      if (organizationId && organizationId !== parent.organizationId) {
        throw new BadRequestException('Parent location belongs to a different organization');
      }

      organizationId = parent.organizationId;
    }

    organizationId = resolveOrganizationScope(user, organizationId);

    if (!organizationId) {
      throw new BadRequestException('Organization is required for creating a location');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true
      }
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    try {
      return await this.prisma.location.create({
        data: {
          organizationId,
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
