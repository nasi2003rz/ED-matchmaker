import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { ScheduleService } from './schedule.service.js';
import { ScheduleQueryDto } from './dto/schedule-query.dto.js';

@Controller('schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.INSTRUCTOR)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload, @Query() query: ScheduleQueryDto) {
    return this.scheduleService.listForInstructor(
      user.id,
      new Date(query.from),
      new Date(query.to),
    );
  }
}
