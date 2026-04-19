import { Injectable } from '@nestjs/common';
import {
  NotificationProvider,
  TaskCreatedNotificationPayload
} from './notification-provider.interface';

@Injectable()
export class ConsoleNotificationProvider implements NotificationProvider {
  async notifyTaskCreated(payload: TaskCreatedNotificationPayload): Promise<void> {
    console.log(`New task created for ${payload.locationName}: ${payload.requestText}`);
  }
}
