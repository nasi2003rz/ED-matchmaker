import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { InstructorsModule } from './instructors/instructors.module.js';
import { StudentsModule } from './students/students.module.js';
import { ClassesModule } from './classes/classes.module.js';
import { JoinModule } from './join/join.module.js';
import { ScheduleModule } from './schedule/schedule.module.js';
import { ProposalsModule } from './proposals/proposals.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { AssignmentsModule } from './assignments/assignments.module.js';
import { GradesModule } from './grades/grades.module.js';
import { MessagingModule } from './messaging/messaging.module.js';
import { PaymentsModule } from './payments/payments.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    CatalogModule,
    InstructorsModule,
    StudentsModule,
    ClassesModule,
    JoinModule,
    ScheduleModule,
    ProposalsModule,
    AttendanceModule,
    AssignmentsModule,
    GradesModule,
    MessagingModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
