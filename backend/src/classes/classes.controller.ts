import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { ClassesService } from './classes.service.js';
import { CreateClassDto } from './dto/create-class.dto.js';
import { UpdateClassDto } from './dto/update-class.dto.js';
import { EnrollStudentDto } from './dto/enroll-student.dto.js';
import { UpdateInvitationStatusDto } from './dto/update-invitation-status.dto.js';
import { CreateProposalDto } from './dto/create-proposal.dto.js';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.INSTRUCTOR)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.classesService.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateClassDto) {
    return this.classesService.create(user.id, dto);
  }

  @Get(':id')
  getOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.classesService.getOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.classesService.update(user.id, id, dto);
  }

  @Get(':id/enrollments')
  listEnrollments(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.classesService.listEnrollments(user.id, id);
  }

  @Post(':id/enrollments')
  enroll(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: EnrollStudentDto,
  ) {
    return this.classesService.enroll(user.id, id, dto.studentId);
  }

  @Delete(':id/enrollments/:studentId')
  unenroll(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    return this.classesService.unenroll(user.id, id, studentId);
  }

  @Get(':id/invitation')
  getInvitation(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.classesService.getInvitation(user.id, id);
  }

  @Patch(':id/invitation')
  setInvitationStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateInvitationStatusDto,
  ) {
    return this.classesService.setInvitationStatus(user.id, id, dto.status);
  }

  @Get(':id/invitations')
  listInvitations(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.classesService.listInvitations(user.id, id);
  }

  @Get(':id/sessions')
  listSessions(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.classesService.listSessions(user.id, id);
  }

  @Post(':id/proposals')
  createProposal(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: CreateProposalDto,
  ) {
    return this.classesService.createProposal(user.id, id, dto);
  }

  @Get(':id/proposals')
  listProposals(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.classesService.listProposals(user.id, id);
  }

  @Patch(':id/proposals/:proposalId/cancel')
  cancelProposal(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('proposalId') proposalId: string,
  ) {
    return this.classesService.cancelProposal(user.id, id, proposalId);
  }
}
