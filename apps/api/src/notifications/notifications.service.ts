import { Inject, Injectable } from '@nestjs/common';
import {
  NOTIFICATION_PROVIDER,
  NotificationProvider,
  TaskCreatedNotificationPayload
} from './notification-provider.interface';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NOTIFICATION_PROVIDER)
    private readonly provider: NotificationProvider
  ) {}

  async notifyTaskCreated(payload: TaskCreatedNotificationPayload): Promise<void> {
    await this.provider.notifyTaskCreated(payload);
  }
}
