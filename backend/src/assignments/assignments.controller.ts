import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { AssignmentsService } from './assignments.service.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { UpdateAssignmentDto } from './dto/update-assignment.dto.js';
import { ReviewSubmissionDto } from './dto/review-submission.dto.js';

// Instructor-side: manage homework for a specific class.
@Controller('classes/:id/assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.INSTRUCTOR)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') classId: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.assignmentsService.create(user.id, classId, dto);
  }

  @Get()
  list(@CurrentUser() user: CurrentUserPayload, @Param('id') classId: string) {
    return this.assignmentsService.listForClass(user.id, classId);
  }

  @Get(':assignmentId')
  getOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') classId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.assignmentsService.getDetail(user.id, classId, assignmentId);
  }

  @Patch(':assignmentId')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') classId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.assignmentsService.update(user.id, classId, assignmentId, dto);
  }

  @Put(':assignmentId/submissions/:studentId/review')
  review(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') classId: string,
    @Param('assignmentId') assignmentId: string,
    @Param('studentId') studentId: string,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.assignmentsService.reviewSubmission(user.id, classId, assignmentId, studentId, dto.score, dto.feedback);
  }
}
