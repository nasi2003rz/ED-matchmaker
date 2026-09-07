import { IsEnum, IsOptional } from 'class-validator';
import { RosterStatus } from '../../generated/prisma/enums.js';

export class ListRosterQueryDto {
  @IsOptional()
  @IsEnum(RosterStatus)
  status?: RosterStatus;
}
