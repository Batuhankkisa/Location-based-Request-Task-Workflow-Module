import { OrganizationType, Role } from '@lbrtw/shared';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getJwtExpiresIn } from './auth.config';
import type { AuthenticatedUser, JwtPayload } from './auth.types';

const userWithOrganization = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: {
    organization: true
  }
});

type UserWithOrganization = Prisma.UserGetPayload<typeof userWithOrganization>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(email: string, password: string) {
    const user = await this.validateCredentials(email, password);
    const accessToken = await this.signAccessToken(user);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: getJwtExpiresIn(),
      user
    };
  }

  async validateCredentials(email: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const cleanPassword = password.trim();

    if (!normalizedEmail || !cleanPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        organization: true
      }
    });

    if (!user || !this.canAuthenticate(user)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await compare(cleanPassword, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.toAuthenticatedUser(user);
  }

  async validateJwtUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true
      }
    });

    if (!user || !this.canAuthenticate(user)) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.toAuthenticatedUser(user);
  }

  private signAccessToken(user: AuthenticatedUser) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      organizationId: user.organizationId
    };

    return this.jwtService.signAsync(payload);
  }

  private toAuthenticatedUser(user: UserWithOrganization): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as Role,
      organizationId: user.organizationId,
      organization: user.organization
        ? {
            id: user.organization.id,
            name: user.organization.name,
            code: user.organization.code,
            type: user.organization.type as OrganizationType,
            isActive: user.organization.isActive
          }
        : null,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  private canAuthenticate(user: UserWithOrganization) {
    if (!user.isActive) {
      return false;
    }

    if (user.role === Role.ADMIN) {
      return true;
    }

    return Boolean(user.organization && user.organization.isActive);
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }
}
