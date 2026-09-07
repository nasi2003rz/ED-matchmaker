import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AssignmentsController } from './assignments.controller.js';
import { HomeworkController } from './homework.controller.js';
import { AssignmentsService } from './assignments.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AssignmentsController, HomeworkController],
  providers: [AssignmentsService],
})
export class AssignmentsModule {}
