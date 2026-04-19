import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TaskStatus } from '@lbrtw/shared';
import { Prisma, TaskStatus as PrismaTaskStatus } from '@prisma/client';
import { ApprovalsService } from '../approvals/approvals.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransitionTaskDto } from './dto/transition-task.dto';

const taskListInclude = {
  request: true,
  location: true
} satisfies Prisma.TaskInclude;

const taskDetailInclude = {
  request: {
    include: {
      qrCode: true
    }
  },
  location: true,
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

  findAll() {
    return this.prisma.task.findMany({
      include: taskListInclude,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: taskDetailInclude
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  start(id: string, dto: TransitionTaskDto) {
    const actor = this.clean(dto.changedBy) ?? 'staff';
    const assignedTo = this.clean(dto.assignedTo) ?? actor;

    return this.transitionTask(id, TaskStatus.NEW, TaskStatus.IN_PROGRESS, {
      changedBy: actor,
      note: this.clean(dto.note) ?? 'Task started',
      data: { assignedTo }
    });
  }

  complete(id: string, dto: TransitionTaskDto) {
    const actor = this.clean(dto.changedBy) ?? 'staff';

    return this.transitionTask(id, TaskStatus.IN_PROGRESS, TaskStatus.DONE_WAITING_APPROVAL, {
      changedBy: actor,
      note: this.clean(dto.note) ?? 'Task completed, waiting for supervisor approval',
      data: {
        completedBy: actor,
        completedAt: new Date()
      }
    });
  }

  approve(id: string, dto: TransitionTaskDto) {
    const actor = this.clean(dto.changedBy) ?? 'supervisor';

    return this.transitionTask(id, TaskStatus.DONE_WAITING_APPROVAL, TaskStatus.APPROVED, {
      changedBy: actor,
      note: this.approvalsService.buildDecisionNote('approve', dto.note),
      data: {
        approvedBy: actor,
        approvedAt: new Date()
      }
    });
  }

  reject(id: string, dto: TransitionTaskDto) {
    const actor = this.clean(dto.changedBy) ?? 'supervisor';

    return this.transitionTask(id, TaskStatus.DONE_WAITING_APPROVAL, TaskStatus.REJECTED, {
      changedBy: actor,
      note: this.approvalsService.buildDecisionNote('reject', dto.note),
      data: {
        rejectedBy: actor,
        rejectedAt: new Date()
      }
    });
  }

  private async transitionTask(
    id: string,
    expectedStatus: TaskStatus,
    nextStatus: TaskStatus,
    options: {
      changedBy: string;
      note: string;
      data?: Prisma.TaskUpdateInput;
    }
  ) {
    const task = await this.prisma.task.findUnique({ where: { id } });

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
}
