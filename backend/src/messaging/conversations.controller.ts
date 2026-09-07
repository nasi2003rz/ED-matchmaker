import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { ConversationsService } from './conversations.service.js';
import { StartConversationDto } from './dto/start-conversation.dto.js';

// Instructor-side: the instructor's own list of conversations, and starting
// a new one with a student or a parent on their roster.
@Controller('conversations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.INSTRUCTOR)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.conversationsService.listForInstructor(user.id);
  }

  @Post('start')
  start(@CurrentUser() user: CurrentUserPayload, @Body() dto: StartConversationDto) {
    return this.conversationsService.startFromInstructor(user.id, {
      studentId: dto.studentId,
      parentId: dto.parentId,
      content: dto.content,
    });
  }
}
