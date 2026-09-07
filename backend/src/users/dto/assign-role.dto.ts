import { IsEnum } from 'class-validator';
import { RoleName } from '../../generated/prisma/enums.js';

export class AssignRoleDto {
  @IsEnum(RoleName)
  role!: RoleName;
}
