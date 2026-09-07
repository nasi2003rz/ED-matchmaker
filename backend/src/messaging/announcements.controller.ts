import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { AnnouncementsService } from './announcements.service.js';
import { CreateAnnouncementDto } from './dto/create-announcement.dto.js';

// Instructor-side: class-wide broadcasts.
@Controller('classes/:id/announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.INSTRUCTOR)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload, @Param('id') classId: string) {
    return this.announcementsService.listForClass(user.id, classId);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') classId: string,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcementsService.create(user.id, classId, dto);
  }
}
