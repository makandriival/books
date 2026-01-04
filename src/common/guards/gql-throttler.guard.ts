import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    // Try GraphQL context first
    try {
      const gqlCtx = GqlExecutionContext.create(context);
      const ctx = gqlCtx.getContext();
      if (ctx.req && ctx.res) {
        return { req: ctx.req, res: ctx.res };
      }
    } catch (error) {
      // Not a GraphQL context, try HTTP context
    }

    // Fall back to HTTP context
    return super.getRequestResponse(context);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use IP address for tracking
    return req.ip || req.connection?.remoteAddress || '127.0.0.1';
  }
}
