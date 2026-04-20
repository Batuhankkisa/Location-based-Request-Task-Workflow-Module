import { Module } from '@nestjs/common';
import { ApprovalsModule } from './approvals/approvals.module';
import { HealthModule } from './health/health.module';
import { LocationsModule } from './locations/locations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { QrCodesModule } from './qr-codes/qr-codes.module';
import { RequestsModule } from './requests/requests.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    LocationsModule,
    QrCodesModule,
    RequestsModule,
    TasksModule,
    ApprovalsModule,
    NotificationsModule
  ]
})
export class AppModule {}
