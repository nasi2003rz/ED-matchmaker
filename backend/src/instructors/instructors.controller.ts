import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { InstructorsService } from './instructors.service.js';
import { UpdateInstructorProfileDto } from './dto/update-instructor-profile.dto.js';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Controller('instructors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.INSTRUCTOR)
export class InstructorsController {
  constructor(private readonly instructorsService: InstructorsService) {}

  @Get('me')
  getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.instructorsService.getMe(user.id);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateInstructorProfileDto,
  ) {
    return this.instructorsService.updateMe(user.id, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: 'uploads/avatars',
        filename: (req, file, cb) => {
          const userId = (req as { user?: CurrentUserPayload }).user?.id ?? 'unknown';
          cb(null, `${userId}-${Date.now()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
          cb(new BadRequestException('فقط فایل تصویری (jpg, png, webp) مجاز است.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('فایلی ارسال نشده است.');
    }
    return this.instructorsService.updateAvatar(user.id, `/uploads/avatars/${file.filename}`);
  }
}
