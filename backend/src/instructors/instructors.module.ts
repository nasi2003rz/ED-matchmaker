import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { InstructorsController } from './instructors.controller.js';
import { InstructorsService } from './instructors.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [InstructorsController],
  providers: [InstructorsService],
})
export class InstructorsModule {}
