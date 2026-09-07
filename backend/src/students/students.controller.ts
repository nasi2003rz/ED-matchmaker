import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName, RosterStatus } from '../generated/prisma/enums.js';
import { StudentsService } from './students.service.js';
import { AddStudentDto } from './dto/add-student.dto.js';
import { UpdateRosterEntryDto } from './dto/update-roster-entry.dto.js';
import { ListRosterQueryDto } from './dto/list-roster-query.dto.js';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.INSTRUCTOR)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload, @Query() query: ListRosterQueryDto) {
    return this.studentsService.listRoster(user.id, query.status ?? RosterStatus.ACTIVE);
  }

  @Post()
  add(@CurrentUser() user: CurrentUserPayload, @Body() dto: AddStudentDto) {
    return this.studentsService.addStudent(user.id, dto.email);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRosterEntryDto,
  ) {
    return this.studentsService.updateRosterEntry(user.id, id, dto);
  }
}
