import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { PaymentsService } from './payments.service.js';

// Student/Parent side: view payment status only — CLAUDE.md Section 5.1
// lists "view payment status" for both, never an action to pay from here
// (Section 6: no payment gateway in Phase 1).
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MyPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('me')
  @Roles(RoleName.STUDENT)
  listMineAsStudent(@CurrentUser() user: CurrentUserPayload) {
    return this.paymentsService.listMine(user.id);
  }

  @Get('me/parent')
  @Roles(RoleName.PARENT)
  listMineAsParent(@CurrentUser() user: CurrentUserPayload) {
    return this.paymentsService.listForParent(user.id);
  }
}
