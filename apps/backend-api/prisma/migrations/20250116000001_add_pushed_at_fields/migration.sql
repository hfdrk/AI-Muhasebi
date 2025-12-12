-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "pushed_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "pushed_at" TIMESTAMPTZ(6);

