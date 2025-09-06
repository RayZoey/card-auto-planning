/*
  Warnings:

  - You are about to drop the column `pause_time` on the `user_task` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user_task` DROP COLUMN `pause_time`,
    ADD COLUMN `segment_start` DATETIME(3) NULL;
