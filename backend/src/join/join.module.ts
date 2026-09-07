import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module.js';
import { JoinController } from './join.controller.js';
import { JoinService } from './join.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), UsersModule],
  controllers: [JoinController],
  providers: [JoinService],
})
export class JoinModule {}
