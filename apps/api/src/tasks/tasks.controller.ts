import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { TransitionTaskDto } from './dto/transition-task.dto';
import { TasksService } from './tasks.service';

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
  async start(@Param('id') id: string, @Body() dto: TransitionTaskDto) {
    return {
      success: true,
      data: await this.tasksService.start(id, dto)
    };
  }

  @Patch(':id/complete')
  async complete(@Param('id') id: string, @Body() dto: TransitionTaskDto) {
    return {
      success: true,
      data: await this.tasksService.complete(id, dto)
    };
  }

  @Patch(':id/approve')
  async approve(@Param('id') id: string, @Body() dto: TransitionTaskDto) {
    return {
      success: true,
      data: await this.tasksService.approve(id, dto)
    };
  }

  @Patch(':id/reject')
  async reject(@Param('id') id: string, @Body() dto: TransitionTaskDto) {
    return {
      success: true,
      data: await this.tasksService.reject(id, dto)
    };
  }
}
