-- AlterTable
ALTER TABLE "User" ADD COLUMN     "creatorDemoNote" TEXT,
ADD COLUMN     "creatorPortfolioUrl" TEXT,
ADD COLUMN     "creatorSampleKeys" TEXT[] DEFAULT ARRAY[]::TEXT[];
