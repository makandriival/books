import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { get } from '@nestled/config/lib/validate';
import { redisStore } from 'cache-manager-redis-yet';

export const CacheConfig: CacheModuleAsyncOptions = {
  isGlobal: true,
  useFactory: async () => {
    const store = await redisStore({
      socket: {
        host: get('REDIS_HOST').default('localhost').asString(),
        port: get('REDIS_PORT').default(6379).asPortNumber(),
      },
      ttl: get('REDIS_TTL').default(3600).asInt() * 1000, // convert to milliseconds
    });

    return {
      store: () => store,
    };
  },
};
