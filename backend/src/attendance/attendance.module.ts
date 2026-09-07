import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceService } from './attendance.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
