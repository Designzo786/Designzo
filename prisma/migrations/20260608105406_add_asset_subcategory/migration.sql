-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "subcategory" TEXT;

-- CreateIndex
CREATE INDEX "Asset_status_category_subcategory_idx" ON "Asset"("status", "category", "subcategory");
