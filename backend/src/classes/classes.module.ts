import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ClassesController } from './classes.controller.js';
import { MyClassesController } from './my-classes.controller.js';
import { ClassesService } from './classes.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [ClassesController, MyClassesController],
  providers: [ClassesService],
})
export class ClassesModule {}
