import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@lbrtw/shared';
import { hash } from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userSelect = Prisma.validator<Prisma.UserDefaultArgs>()({
  select: {
    id: true,
    email: true,
    fullName: true,
    role: true,
    isActive: true,
    organizationId: true,
    organization: {
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        isActive: true
      }
    },
    createdAt: true,
    updatedAt: true
  }
});

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId?: string) {
    return this.prisma.user.findMany({
      where: organizationId
        ? {
            organizationId
          }
        : undefined,
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      ...userSelect
    });
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();
    const password = dto.password.trim();
    const organizationId = await this.resolveOrganizationId(dto.role, dto.organizationId);

    if (!email || !fullName || !password) {
      throw new BadRequestException('Email, full name, and password are required');
    }

    try {
      return await this.prisma.user.create({
        data: {
          email,
          fullName,
          role: dto.role,
          passwordHash: await hash(password, 10),
          isActive: dto.isActive ?? true,
          ...(organizationId
            ? {
                organization: {
                  connect: { id: organizationId }
                }
              }
            : {})
        },
        ...userSelect
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('User email already exists');
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.ensureExists(id);

    const data: Prisma.UserUpdateInput = {};

    if (typeof dto.email === 'string') {
      const email = dto.email.trim().toLowerCase();
      if (!email) {
        throw new BadRequestException('Email cannot be empty');
      }

      data.email = email;
    }

    if (typeof dto.fullName === 'string') {
      const fullName = dto.fullName.trim();
      if (!fullName) {
        throw new BadRequestException('Full name cannot be empty');
      }

      data.fullName = fullName;
    }

    const nextRole = dto.role ?? (await this.getExistingRole(id));
    if (dto.role) {
      data.role = dto.role;
    }

    if (typeof dto.password === 'string') {
      const password = dto.password.trim();
      if (!password) {
        throw new BadRequestException('Password cannot be empty');
      }

      data.passwordHash = await hash(password, 10);
    }

    if (typeof dto.isActive === 'boolean') {
      data.isActive = dto.isActive;
    }

    if (dto.organizationId !== undefined || dto.role !== undefined) {
      const organizationId = await this.resolveOrganizationId(nextRole, dto.organizationId);
      data.organization = organizationId
        ? {
            connect: { id: organizationId }
          }
        : {
            disconnect: true
          };
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        ...userSelect
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('User email already exists');
      }

      throw error;
    }
  }

  private async ensureExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async getExistingRole(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        role: true
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.role as Role;
  }

  private async resolveOrganizationId(role: Role, organizationId?: string | null) {
    if (role === Role.ADMIN) {
      return null;
    }

    const normalizedOrganizationId = organizationId?.trim();
    if (!normalizedOrganizationId) {
      throw new BadRequestException('Non-admin users must be assigned to an organization');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: normalizedOrganizationId },
      select: {
        id: true
      }
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization.id;
  }
}
