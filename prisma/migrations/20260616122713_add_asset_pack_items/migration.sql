-- CreateTable
CREATE TABLE "AssetPackItem" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "modelKey" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetPackItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetPackItem_assetId_displayOrder_idx" ON "AssetPackItem"("assetId", "displayOrder");

-- AddForeignKey
ALTER TABLE "AssetPackItem" ADD CONSTRAINT "AssetPackItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
