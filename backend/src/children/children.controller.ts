import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { ChildrenService } from './children.service.js';
import { LinkChildDto } from './dto/link-child.dto.js';

@Controller('children')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.PARENT)
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.childrenService.listChildren(user.id);
  }

  @Post()
  link(@CurrentUser() user: CurrentUserPayload, @Body() dto: LinkChildDto) {
    return this.childrenService.linkChild(user.id, dto.email);
  }

  @Delete(':studentId')
  unlink(@CurrentUser() user: CurrentUserPayload, @Param('studentId') studentId: string) {
    return this.childrenService.unlinkChild(user.id, studentId);
  }
}
