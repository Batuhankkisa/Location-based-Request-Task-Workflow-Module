import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TaskStatus } from '@lbrtw/shared';
import { Prisma, TaskStatus as PrismaTaskStatus } from '@prisma/client';
import { ApprovalsService } from '../approvals/approvals.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { resolveOrganizationScope } from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import { TransitionTaskDto } from './dto/transition-task.dto';

const taskListInclude = {
  request: true,
  location: {
    include: {
      organization: true
    }
  }
} satisfies Prisma.TaskInclude;

const taskDetailInclude = {
  request: {
    include: {
      qrCode: true,
      media: {
        orderBy: { createdAt: 'asc' as const }
      }
    }
  },
  location: {
    include: {
      organization: true
    }
  },
  history: {
    orderBy: { createdAt: 'asc' as const }
  }
} satisfies Prisma.TaskInclude;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalsService: ApprovalsService
  ) {}

  findAll(user: AuthenticatedUser, requestedOrganizationId?: string) {
    return this.findAllByScope(resolveOrganizationScope(user, requestedOrganizationId));
  }

  findAllForOrganization(organizationId: string) {
    return this.findAllByScope(organizationId);
  }

  private findAllByScope(organizationId?: string) {
    return this.prisma.task.findMany({
      where: this.buildTaskWhere(organizationId),
      include: taskListInclude,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        ...this.buildTaskWhere(resolveOrganizationScope(user))
      },
      include: taskDetailInclude
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  start(id: string, dto: TransitionTaskDto, user: AuthenticatedUser) {
    const actor = this.actorLabel(user);
    const assignedTo = actor;

    return this.transitionTask(user, id, TaskStatus.NEW, TaskStatus.IN_PROGRESS, {
      changedBy: actor,
      note: this.clean(dto.note) ?? 'Task started',
      data: { assignedTo }
    });
  }

  complete(id: string, dto: TransitionTaskDto, user: AuthenticatedUser) {
    const actor = this.actorLabel(user);

    return this.transitionTask(user, id, TaskStatus.IN_PROGRESS, TaskStatus.DONE_WAITING_APPROVAL, {
      changedBy: actor,
      note: this.clean(dto.note) ?? 'Task completed, waiting for supervisor approval',
      data: {
        completedBy: actor,
        completedAt: new Date()
      }
    });
  }

  approve(id: string, dto: TransitionTaskDto, user: AuthenticatedUser) {
    const actor = this.actorLabel(user);

    return this.transitionTask(user, id, TaskStatus.DONE_WAITING_APPROVAL, TaskStatus.APPROVED, {
      changedBy: actor,
      note: this.approvalsService.buildDecisionNote('approve', dto.note),
      data: {
        approvedBy: actor,
        approvedAt: new Date()
      }
    });
  }

  reject(id: string, dto: TransitionTaskDto, user: AuthenticatedUser) {
    const actor = this.actorLabel(user);

    return this.transitionTask(user, id, TaskStatus.DONE_WAITING_APPROVAL, TaskStatus.REJECTED, {
      changedBy: actor,
      note: this.approvalsService.buildDecisionNote('reject', dto.note)
    });
  }

  private async transitionTask(
    user: AuthenticatedUser,
    id: string,
    expectedStatus: TaskStatus,
    nextStatus: TaskStatus,
    options: {
      changedBy: string;
      note: string;
      data?: Prisma.TaskUpdateInput;
    }
  ) {
    const organizationId = resolveOrganizationScope(user);
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        ...this.buildTaskWhere(organizationId)
      }
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== expectedStatus) {
      throw new BadRequestException(
        `Invalid task transition from ${task.status} to ${nextStatus}; expected ${expectedStatus}`
      );
    }

    const updatedTask = await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id },
        data: {
          ...options.data,
          status: nextStatus as PrismaTaskStatus
        }
      });

      await tx.taskHistory.create({
        data: {
          taskId: id,
          fromStatus: task.status,
          toStatus: nextStatus as PrismaTaskStatus,
          note: options.note,
          changedBy: options.changedBy
        }
      });

      return tx.task.findUnique({
        where: { id },
        include: taskDetailInclude
      });
    });

    if (!updatedTask) {
      throw new NotFoundException('Task not found');
    }

    return updatedTask;
  }

  private clean(value?: string): string | undefined {
    const cleanValue = value?.trim();
    return cleanValue ? cleanValue : undefined;
  }

  private actorLabel(user: AuthenticatedUser) {
    return this.clean(user.fullName) ?? user.email;
  }

  private buildTaskWhere(organizationId?: string): Prisma.TaskWhereInput | undefined {
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
