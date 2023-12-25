import { ZodError } from "zod";
import { KEY_GENERATOR } from "./const";
import { redis } from "connections/redis";

export function validatorHook(
  result:
    | {
        success: true;
        data: any;
      }
    | {
        success: false;
        error: ZodError;
      }
) {
  if (!result.success) {
    throw result.error;
  }
}

export function cache(
  ttlOptions: { ttl: number; resetOnHit: boolean } | null = {
    ttl: 3600,
    resetOnHit: true,
  }
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const key = KEY_GENERATOR.cacheKey(propertyKey, args);

      const results = await redis.get(key);

      if (!results) {
        const data = await originalMethod.apply(this, args);
        if (ttlOptions) {
          await redis.setEx(key, ttlOptions.ttl, JSON.stringify(data));
        } else {
          await redis.set(key, JSON.stringify(data));
        }
        return data;
      }

      if (ttlOptions?.resetOnHit) {
        await redis.expire(key, ttlOptions.ttl);
      }
      return JSON.parse(results);
    };

    return descriptor;
  };
}
