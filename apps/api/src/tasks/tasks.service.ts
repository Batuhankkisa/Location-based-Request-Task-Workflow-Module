import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

  async completeFromTelegram(input: {
    taskId: string;
    chatId: string;
    messageThreadId?: number;
    actor: string;
    note?: string;
  }) {
    const task = await this.prisma.task.findUnique({
      where: { id: input.taskId },
      include: {
        location: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const organization = task.location.organization;
    if (!organization.telegramEnabled || !organization.telegramChatId) {
      throw new ForbiddenException('Telegram is not enabled for this task organization');
    }

    if (organization.telegramChatId.trim() !== input.chatId.trim()) {
      throw new ForbiddenException('Telegram chat is not allowed for this task organization');
    }

    const configuredThreadId = this.parseOptionalInteger(organization.telegramNotificationThreadId);
    if (typeof configuredThreadId === 'number' && configuredThreadId !== input.messageThreadId) {
      throw new ForbiddenException('Telegram topic is not allowed for this task organization');
    }

    if (task.status === PrismaTaskStatus.DONE_WAITING_APPROVAL) {
      return {
        task,
        changed: false
      };
    }

    if (task.status === PrismaTaskStatus.APPROVED || task.status === PrismaTaskStatus.REJECTED) {
      throw new BadRequestException(`Task is already ${task.status}`);
    }

    const nextStatus = PrismaTaskStatus.DONE_WAITING_APPROVAL;
    const updatedTask = await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: input.taskId },
        data: {
          assignedTo: task.assignedTo ?? input.actor,
          completedBy: input.actor,
          completedAt: new Date(),
          status: nextStatus
        }
      });

      await tx.taskHistory.create({
        data: {
          taskId: input.taskId,
          fromStatus: task.status,
          toStatus: nextStatus,
          note: input.note ?? 'Task completed from Telegram command',
          changedBy: input.actor
        }
      });

      return tx.task.findUnique({
        where: { id: input.taskId },
        include: taskDetailInclude
      });
    });

    if (!updatedTask) {
      throw new NotFoundException('Task not found');
    }

    return {
      task: updatedTask,
      changed: true
    };
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

  private parseOptionalInteger(value: string | null) {
    const cleanValue = value?.trim();
    if (!cleanValue) {
      return undefined;
    }

    const parsed = Number(cleanValue);
    if (!Number.isInteger(parsed)) {
      throw new BadRequestException(`Invalid Telegram thread id: ${cleanValue}`);
    }

    return parsed;
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
