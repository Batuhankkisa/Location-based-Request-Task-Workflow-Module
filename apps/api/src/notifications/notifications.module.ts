import { Module } from '@nestjs/common';
import { ConsoleNotificationProvider } from './console-notification.provider';
import { NotificationsService } from './notifications.service';

@Module({
  providers: [ConsoleNotificationProvider, NotificationsService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
