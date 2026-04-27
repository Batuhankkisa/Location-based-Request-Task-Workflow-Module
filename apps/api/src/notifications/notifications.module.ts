import { Module } from '@nestjs/common';
import { ConsoleNotificationProvider } from './console-notification.provider';
import { NotificationsService } from './notifications.service';
import { TelegramClient } from './telegram.client';
import { TelegramNotificationProvider } from './telegram-notification.provider';

@Module({
  providers: [
    ConsoleNotificationProvider,
    TelegramClient,
    TelegramNotificationProvider,
    NotificationsService
  ],
  exports: [NotificationsService]
})
export class NotificationsModule {}
