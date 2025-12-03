import { getConfig } from "../env";

export function getRedisUrl(): string | undefined {
  return getConfig().REDIS_URL;
}
