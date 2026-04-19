import { Injectable } from '@nestjs/common';
import { ConsoleNotificationProvider } from './console-notification.provider';
import { TaskCreatedNotificationPayload } from './notification-provider.interface';

@Injectable()
export class NotificationsService {
  constructor(private readonly provider: ConsoleNotificationProvider) {}

  async notifyTaskCreated(payload: TaskCreatedNotificationPayload): Promise<void> {
    await this.provider.notifyTaskCreated(payload);
  }
}
