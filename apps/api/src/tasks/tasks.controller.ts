import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Role } from '@lbrtw/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { TransitionTaskDto } from './dto/transition-task.dto';
import { TasksService } from './tasks.service';

@Roles(Role.ADMIN, Role.SUPERVISOR, Role.STAFF)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async findAll() {
    return {
      success: true,
      data: await this.tasksService.findAll()
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return {
      success: true,
      data: await this.tasksService.findOne(id)
    };
  }

  @Patch(':id/start')
  async start(
    @Param('id') id: string,
    @Body() dto: TransitionTaskDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return {
      success: true,
      data: await this.tasksService.start(id, dto, user)
    };
  }

  @Patch(':id/complete')
  async complete(
    @Param('id') id: string,
    @Body() dto: TransitionTaskDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return {
      success: true,
      data: await this.tasksService.complete(id, dto, user)
    };
  }

  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() dto: TransitionTaskDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return {
      success: true,
      data: await this.tasksService.approve(id, dto, user)
    };
  }

  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() dto: TransitionTaskDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return {
      success: true,
      data: await this.tasksService.reject(id, dto, user)
    };
  }
}
