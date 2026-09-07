import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { GradesService } from './grades.service.js';

// Student-side: view grades across all of the student's classes.
@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.STUDENT)
export class MyGradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get('me')
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.gradesService.listMine(user.id);
  }
}
