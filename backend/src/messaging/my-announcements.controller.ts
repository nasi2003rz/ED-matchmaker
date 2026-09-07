import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { AnnouncementsService } from './announcements.service.js';

// Student/Parent side: announcements aggregated across the student's own
// active enrollments, or (for a parent) across all of their children's.
@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MyAnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get('me')
  @Roles(RoleName.STUDENT)
  listMineAsStudent(@CurrentUser() user: CurrentUserPayload) {
    return this.announcementsService.listForStudent(user.id);
  }

  @Get('me/parent')
  @Roles(RoleName.PARENT)
  listMineAsParent(@CurrentUser() user: CurrentUserPayload) {
    return this.announcementsService.listForParent(user.id);
  }
}
