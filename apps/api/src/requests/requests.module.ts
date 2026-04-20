import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PublicRequestsController } from './public-requests.controller';
import { RequestMediaStorageService } from './request-media-storage.service';
import { RequestsService } from './requests.service';

@Module({
  imports: [NotificationsModule],
  controllers: [PublicRequestsController],
  providers: [RequestsService, RequestMediaStorageService]
})
export class RequestsModule {}
