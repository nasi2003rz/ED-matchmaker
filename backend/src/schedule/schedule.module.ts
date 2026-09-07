import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ScheduleController } from './schedule.controller.js';
import { ScheduleService } from './schedule.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [ScheduleController],
  providers: [ScheduleService],
})
export class ScheduleModule {}
