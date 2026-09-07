import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { AssignmentsService } from './assignments.service.js';
import { SubmitHomeworkDto } from './dto/submit-homework.dto.js';

// Student-side: view + submit homework across all of the student's classes.
@Controller('homework')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.STUDENT)
export class HomeworkController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get('me')
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.assignmentsService.listMine(user.id);
  }

  @Put(':assignmentId/submit')
  submit(
    @CurrentUser() user: CurrentUserPayload,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: SubmitHomeworkDto,
  ) {
    return this.assignmentsService.submit(user.id, assignmentId, dto.content);
  }
}
