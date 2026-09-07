import { IsEnum } from 'class-validator';
import { AttendanceStatus } from '../../generated/prisma/enums.js';

export class MarkAttendanceDto {
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;
}
