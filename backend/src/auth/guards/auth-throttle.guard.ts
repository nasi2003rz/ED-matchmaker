import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

// A minimal in-memory sliding-window limiter for the auth endpoints
// (login/register — the classic credential-stuffing and spam-registration
// targets). @nestjs/throttler still has no release supporting
// @nestjs/common ^12 (checked again during this audit — same gap noted in
// the README since Step 4), so this stands in for it. Known Phase-1
// limitations, both acceptable for a single-instance deployment: resets on
// process restart, and doesn't share state across instances. A periodic
// sweep keeps the map from growing unbounded across many distinct IPs.
@Injectable()
export class AuthThrottleGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private readonly windowMs = 15 * 60 * 1000;
  private readonly max = 10;
  private lastSweep = Date.now();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const now = Date.now();
    this.sweepIfDue(now);

    const key = `${req.ip}:${req.path}`;
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (bucket.count >= this.max) {
      throw new HttpException(
        'تعداد تلاش‌های شما بیش از حد مجاز است. چند دقیقه‌ی دیگر دوباره امتحان کنید.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count += 1;
    return true;
  }

  private sweepIfDue(now: number) {
    if (now - this.lastSweep < this.windowMs) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
