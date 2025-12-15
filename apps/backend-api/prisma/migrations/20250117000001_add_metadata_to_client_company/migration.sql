-- AlterTable
ALTER TABLE "client_companies" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}';


