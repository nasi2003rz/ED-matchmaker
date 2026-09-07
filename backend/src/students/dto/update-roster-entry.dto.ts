import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { RosterStatus } from '../../generated/prisma/enums.js';

export class UpdateRosterEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsEnum(RosterStatus)
  status?: RosterStatus;
}
