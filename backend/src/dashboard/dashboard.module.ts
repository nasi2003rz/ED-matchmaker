import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AssignmentsModule } from '../assignments/assignments.module.js';
import { GradesModule } from '../grades/grades.module.js';
import { MessagingModule } from '../messaging/messaging.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AssignmentsModule,
    GradesModule,
    MessagingModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
