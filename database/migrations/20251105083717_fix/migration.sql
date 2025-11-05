/*
  Warnings:

  - You are about to drop the column `priority` on the `platform_task` table. All the data in the column will be lost.
  - You are about to drop the column `planned_date` on the `user_task` table. All the data in the column will be lost.
  - You are about to drop the column `seq` on the `user_task` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `platform_task` DROP COLUMN `priority`,
    ADD COLUMN `sort_order` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `user_task` DROP COLUMN `planned_date`,
    DROP COLUMN `seq`,
    ADD COLUMN `sort_order` INTEGER NOT NULL DEFAULT 0;
