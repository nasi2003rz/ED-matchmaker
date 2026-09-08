import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { NotificationsService } from './notifications.service.js';

// Available to any authenticated role — a notification belongs to a User,
// not to a specific role's feature set (CLAUDE.md Section 5.2).
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload, @Query('unread') unread?: string) {
    return this.notificationsService.listMine(user.id, unread === 'true');
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: CurrentUserPayload) {
    // A bare number body gets served as text/html (not application/json) by
    // the underlying response handling, which the frontend's JSON-only
    // fetch wrapper silently can't parse — wrap it like every other
    // endpoint in this codebase already does (e.g. { success: true }).
    return { count: await this.notificationsService.unreadCount(user.id) };
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.markAllRead(user.id);
  }
}
