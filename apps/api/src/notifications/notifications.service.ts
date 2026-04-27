import { Injectable, Logger } from '@nestjs/common';
import { ConsoleNotificationProvider } from './console-notification.provider';
import {
  NotificationProvider,
  TaskCreatedNotificationPayload
} from './notification-provider.interface';
import { TelegramNotificationProvider } from './telegram-notification.provider';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly providers: NotificationProvider[];

  constructor(
    consoleProvider: ConsoleNotificationProvider,
    telegramProvider: TelegramNotificationProvider
  ) {
    this.providers = [consoleProvider, telegramProvider];
  }

  async notifyTaskCreated(payload: TaskCreatedNotificationPayload): Promise<void> {
    await Promise.all(
      this.providers.map(async (provider) => {
        try {
          await provider.notifyTaskCreated(payload);
        } catch (error) {
          this.logger.error(
            `${provider.constructor.name} failed while handling task ${payload.task.id}`,
            error instanceof Error ? error.stack : String(error)
          );
        }
      })
    );
  }
}
