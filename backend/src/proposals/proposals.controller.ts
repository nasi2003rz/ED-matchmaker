import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { ProposalsService } from './proposals.service.js';
import { RespondProposalDto } from './dto/respond-proposal.dto.js';

@Controller('proposals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.STUDENT)
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get('me')
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.proposalsService.listMine(user.id);
  }

  @Patch(':id/respond')
  respond(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: RespondProposalDto,
  ) {
    return this.proposalsService.respond(user.id, id, dto.action);
  }
}
