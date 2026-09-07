import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePaymentDto } from './create-payment.dto.js';

// studentId is fixed at creation — editing a payment never reassigns it to
// a different student, only its content.
export class UpdatePaymentDto extends PartialType(OmitType(CreatePaymentDto, ['studentId'] as const)) {}
