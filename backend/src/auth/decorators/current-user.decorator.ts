import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { RoleName } from '../../generated/prisma/enums.js';

export interface CurrentUserPayload {
  id: string;
  email: string;
  name: string;
  roles: RoleName[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
