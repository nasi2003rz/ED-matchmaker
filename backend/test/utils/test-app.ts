import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

/**
 * Builds a Nest app for e2e tests wired the same way as `src/main.ts`
 * (global `api` prefix, the whitelist/transform ValidationPipe, cookie
 * parsing for the refresh-token cookie) so requests behave exactly like
 * they do against the real running server. Helmet and static asset
 * serving are skipped — they don't affect any response this suite checks
 * and would only add startup cost.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}

export function getPrisma(app: INestApplication): PrismaService {
  return app.get(PrismaService);
}

/** A short random suffix so repeated local test runs never collide on the
 * unique `email` constraint (this suite runs against the real dev DB —
 * there is no disposable per-run test database in this project yet). */
export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Deletes every User row (and, via schema cascades, everything they own —
 * Instructor/Student/Parent profiles, classes, enrollments, sessions,
 * assignments, grades, payments, conversations, notifications, etc.) for
 * the given emails. Exact, explicit list — never a broad/glob delete. */
export async function cleanupUsers(app: INestApplication, emails: string[]): Promise<void> {
  const prisma = getPrisma(app);
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
}
