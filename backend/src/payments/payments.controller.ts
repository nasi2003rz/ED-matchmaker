import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { UpdatePaymentDto } from './dto/update-payment.dto.js';
import { RecordPaymentDto } from './dto/record-payment.dto.js';

// Instructor-side: manage tuition invoices for a specific class.
@Controller('classes/:id/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.INSTRUCTOR)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload, @Param('id') classId: string) {
    return this.paymentsService.listForClass(user.id, classId);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') classId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(user.id, classId, dto);
  }

  @Patch(':paymentId')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') classId: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(user.id, classId, paymentId, dto);
  }

  @Delete(':paymentId')
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') classId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.paymentsService.remove(user.id, classId, paymentId);
  }

  @Put(':paymentId/record')
  recordPayment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') classId: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.paymentsService.recordPayment(user.id, classId, paymentId, dto.amount);
  }
}
