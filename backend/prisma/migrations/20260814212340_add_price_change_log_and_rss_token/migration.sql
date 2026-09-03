/*
  Warnings:

  - A unique constraint covering the columns `[rssTokenHash]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "rssTokenHash" TEXT;

-- CreateTable
CREATE TABLE "PriceChangeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" INTEGER NOT NULL,
    "oldPrice" DECIMAL,
    "newPrice" DECIMAL,
    "oldDiscount" INTEGER,
    "newDiscount" INTEGER,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceChangeLog_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("steam_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PriceChangeLog_gameId_timestamp_idx" ON "PriceChangeLog"("gameId", "timestamp");

-- CreateIndex
CREATE INDEX "PriceChangeLog_timestamp_idx" ON "PriceChangeLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "User_rssTokenHash_key" ON "User"("rssTokenHash");
