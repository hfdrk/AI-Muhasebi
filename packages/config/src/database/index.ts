import { getConfig } from "../env";

export function getDatabaseUrl(): string {
  return getConfig().DATABASE_URL;
}
