import { Module } from '@nestjs/common';
import { LocationsModule } from '../locations/locations.module';
import { QrCodesModule } from '../qr-codes/qr-codes.module';
import { TasksModule } from '../tasks/tasks.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [LocationsModule, QrCodesModule, TasksModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService]
})
export class OrganizationsModule {}
