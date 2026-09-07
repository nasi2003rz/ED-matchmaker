import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { GradesService } from './grades.service.js';
import { CreateGradeDto } from './dto/create-grade.dto.js';
import { UpdateGradeDto } from './dto/update-grade.dto.js';

// Instructor-side: manage the grade book for a specific class.
@Controller('classes/:id/grades')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.INSTRUCTOR)
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload, @Param('id') classId: string) {
    return this.gradesService.listForClass(user.id, classId);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') classId: string,
    @Body() dto: CreateGradeDto,
  ) {
    return this.gradesService.create(user.id, classId, dto);
  }

  @Patch(':gradeId')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') classId: string,
    @Param('gradeId') gradeId: string,
    @Body() dto: UpdateGradeDto,
  ) {
    return this.gradesService.update(user.id, classId, gradeId, dto);
  }

  @Delete(':gradeId')
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') classId: string,
    @Param('gradeId') gradeId: string,
  ) {
    return this.gradesService.remove(user.id, classId, gradeId);
  }
}
