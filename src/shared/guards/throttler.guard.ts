import type { ExecutionContext } from '@nestjs/common';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ERROR } from 'src/constants/exception.constant';
import { BaseException } from 'src/shared/filters/exception.filter';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Safely handle potentially undefined IP addresses
    if (req.ips && req.ips.length > 0) {
      return req.ips[0] || '127.0.0.1';
    }
    return req.ip || '127.0.0.1';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const canActivate = await super.canActivate(context);

      return canActivate;
    } catch {
      throw new BaseException(ERROR.TOO_MANY_REQUESTS, HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
