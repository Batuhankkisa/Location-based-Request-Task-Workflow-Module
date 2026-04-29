import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { ConsoleNotificationProvider } from './console-notification.provider';
import { NotificationsService } from './notifications.service';
import { TelegramClient } from './telegram.client';
import { TelegramNotificationProvider } from './telegram-notification.provider';
import { TelegramUpdateService } from './telegram-update.service';
import { TelegramWebhookController } from './telegram-webhook.controller';

@Module({
  imports: [TasksModule],
  controllers: [TelegramWebhookController],
  providers: [
    ConsoleNotificationProvider,
    TelegramClient,
    TelegramNotificationProvider,
    TelegramUpdateService,
    NotificationsService
  ],
  exports: [NotificationsService]
})
export class NotificationsModule {}
