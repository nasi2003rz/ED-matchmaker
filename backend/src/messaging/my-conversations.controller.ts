import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { ConversationsService } from './conversations.service.js';
import { StartConversationDto } from './dto/start-conversation.dto.js';

// Student/Parent side: their own conversations with instructors, including
// starting a new one with an instructor already on their roster.
@Controller('conversations/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.STUDENT, RoleName.PARENT)
export class MyConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.conversationsService.listForStudentOrParent(user.id);
  }

  @Get('instructors')
  listStartableInstructors(@CurrentUser() user: CurrentUserPayload) {
    return this.conversationsService.listStartableInstructors(user.id);
  }

  @Post('start')
  start(@CurrentUser() user: CurrentUserPayload, @Body() dto: StartConversationDto) {
    if (!dto.instructorId) {
      throw new BadRequestException('instructorId الزامی است.');
    }
    return this.conversationsService.startFromStudentOrParent(user.id, {
      instructorId: dto.instructorId,
      content: dto.content,
    });
  }
}
