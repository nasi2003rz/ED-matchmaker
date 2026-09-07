import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { JoinService } from './join.service.js';

@Controller('join/class')
export class JoinController {
  constructor(private readonly joinService: JoinService) {}

  @Get(':classId')
  preview(@Param('classId') classId: string) {
    return this.joinService.preview(classId);
  }

  @Post(':classId')
  @UseGuards(JwtAuthGuard)
  accept(@CurrentUser() user: CurrentUserPayload, @Param('classId') classId: string) {
    return this.joinService.accept(user.id, classId);
  }
}
