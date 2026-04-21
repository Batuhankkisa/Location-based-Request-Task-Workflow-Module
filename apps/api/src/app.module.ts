import { Module } from '@nestjs/common';
import { ApprovalsModule } from './approvals/approvals.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { LocationsModule } from './locations/locations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { QrCodesModule } from './qr-codes/qr-codes.module';
import { RequestsModule } from './requests/requests.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HealthModule,
    LocationsModule,
    QrCodesModule,
    RequestsModule,
    TasksModule,
    UsersModule,
    ApprovalsModule,
    NotificationsModule
  ]
})
export class AppModule {}
