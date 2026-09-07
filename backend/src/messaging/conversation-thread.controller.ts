import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { ConversationsService } from './conversations.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';

// Shared: any of the three roles may hold a conversation — access is
// authorized per-conversation server-side (the caller must actually be one
// of its two parties), not by role alone.
@Controller('conversations/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.INSTRUCTOR, RoleName.STUDENT, RoleName.PARENT)
export class ConversationThreadController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get('messages')
  getThread(@CurrentUser() user: CurrentUserPayload, @Param('id') conversationId: string) {
    return this.conversationsService.getThread(user.id, conversationId);
  }

  @Post('messages')
  sendMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversationsService.sendMessage(user.id, conversationId, dto.content);
  }

  @Patch('read')
  markRead(@CurrentUser() user: CurrentUserPayload, @Param('id') conversationId: string) {
    return this.conversationsService.markRead(user.id, conversationId);
  }
}
