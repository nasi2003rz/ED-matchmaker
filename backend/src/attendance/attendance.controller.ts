import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { AttendanceService } from './attendance.service.js';
import { MarkAttendanceDto } from './dto/mark-attendance.dto.js';

@Controller('classes/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.INSTRUCTOR)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('sessions/:sessionId/attendance')
  getSessionAttendance(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') classId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.attendanceService.getSessionAttendance(user.id, classId, sessionId);
  }

  @Put('sessions/:sessionId/attendance/:studentId')
  markAttendance(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') classId: string,
    @Param('sessionId') sessionId: string,
    @Param('studentId') studentId: string,
    @Body() dto: MarkAttendanceDto,
  ) {
    return this.attendanceService.markAttendance(user.id, classId, sessionId, studentId, dto.status);
  }

  @Get('attendance-summary')
  getSummary(@CurrentUser() user: CurrentUserPayload, @Param('id') classId: string) {
    return this.attendanceService.getClassAttendanceSummary(user.id, classId);
  }
}
