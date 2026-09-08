import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { ClassesService } from './classes.service.js';

// Student-side: "my classes" list (CLAUDE.md Section 7 nav). Kept on a
// separate `enrollments` prefix rather than nested under `classes/:id` —
// ClassesController is instructor-only and already owns a bare
// `GET classes/:id` route, so a sibling static path there would collide
// with that param route.
@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MyClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get('mine')
  @Roles(RoleName.STUDENT)
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.classesService.listForStudent(user.id);
  }
}
