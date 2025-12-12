-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}';

