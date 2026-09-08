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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';
import { InstructorsService } from './instructors.service.js';
import { UpdateInstructorProfileDto } from './dto/update-instructor-profile.dto.js';

// Server-controlled extension per accepted mimetype — the saved file's
// extension must never come from the client-supplied original filename.
// `file.mimetype` is a declared, client-controlled header value too, but at
// least it's checked against this same allowlist before a branch is picked;
// what it can never do is smuggle an arbitrary extension (e.g. naming an
// upload "x.svg" or "x.html" while declaring an allowed image mimetype) —
// that combination previously let a stored .svg reach /uploads/avatars
// with its original attacker-chosen extension, capable of embedded
// <script> and served from the app's own origin.
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

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
          const extension = ALLOWED_IMAGE_TYPES[file.mimetype] ?? '.jpg';
          cb(null, `${userId}-${Date.now()}${extension}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!(file.mimetype in ALLOWED_IMAGE_TYPES)) {
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
