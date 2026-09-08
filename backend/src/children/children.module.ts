import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ChildrenController } from './children.controller.js';
import { ChildrenService } from './children.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [ChildrenController],
  providers: [ChildrenService],
})
export class ChildrenModule {}
