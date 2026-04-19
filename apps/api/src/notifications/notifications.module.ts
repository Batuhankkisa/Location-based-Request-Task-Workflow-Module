import { Module } from '@nestjs/common';
import { ConsoleNotificationProvider } from './console-notification.provider';
import { NOTIFICATION_PROVIDER } from './notification-provider.interface';
import { NotificationsService } from './notifications.service';

@Module({
  providers: [
    ConsoleNotificationProvider,
    {
      provide: NOTIFICATION_PROVIDER,
      useExisting: ConsoleNotificationProvider
    },
    NotificationsService
  ],
  exports: [NotificationsService]
})
export class NotificationsModule {}
