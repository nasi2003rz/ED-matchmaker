import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { GradesController } from './grades.controller.js';
import { MyGradesController } from './my-grades.controller.js';
import { GradesService } from './grades.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [GradesController, MyGradesController],
  providers: [GradesService],
  exports: [GradesService],
})
export class GradesModule {}
