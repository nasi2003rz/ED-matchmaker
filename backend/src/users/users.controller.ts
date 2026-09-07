import { Body, Controller, Get, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { UsersService } from './users.service.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: CurrentUserPayload) {
    const me = await this.usersService.findMeWithRoles(user.id);
    if (!me) {
      throw new NotFoundException();
    }
    return { user: me };
  }

  @Post('me/roles')
  async assignRole(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AssignRoleDto,
  ) {
    const roles = await this.usersService.assignRole(user.id, dto.role);
    return { roles };
  }
}
