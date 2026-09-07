import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { StudentsController } from './students.controller.js';
import { StudentsService } from './students.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
