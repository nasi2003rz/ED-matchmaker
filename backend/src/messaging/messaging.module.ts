import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AnnouncementsController } from './announcements.controller.js';
import { MyAnnouncementsController } from './my-announcements.controller.js';
import { AnnouncementsService } from './announcements.service.js';
import { ConversationsController } from './conversations.controller.js';
import { MyConversationsController } from './my-conversations.controller.js';
import { ConversationThreadController } from './conversation-thread.controller.js';
import { ConversationsService } from './conversations.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [
    AnnouncementsController,
    MyAnnouncementsController,
    ConversationsController,
    MyConversationsController,
    ConversationThreadController,
  ],
  providers: [AnnouncementsService, ConversationsService],
})
export class MessagingModule {}
