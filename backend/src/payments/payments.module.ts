import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PaymentsController } from './payments.controller.js';
import { MyPaymentsController } from './my-payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [PaymentsController, MyPaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
