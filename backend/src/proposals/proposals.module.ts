import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ProposalsController } from './proposals.controller.js';
import { ProposalsService } from './proposals.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [ProposalsController],
  providers: [ProposalsService],
})
export class ProposalsModule {}
