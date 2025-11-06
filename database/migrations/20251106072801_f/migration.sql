/*
  Warnings:

  - You are about to drop the column `can_divisible` on the `platform_task` table. All the data in the column will be lost.
  - You are about to drop the column `sort_order` on the `platform_task` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `platform_task_group` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `platform_task` DROP COLUMN `can_divisible`,
    DROP COLUMN `sort_order`;

-- AlterTable
ALTER TABLE `platform_task_group` DROP COLUMN `priority`;

-- AlterTable
ALTER TABLE `platform_task_group_and_task_relation` ADD COLUMN `can_divisible` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `priority` INTEGER NOT NULL DEFAULT 9999,
    ADD COLUMN `sort_order` INTEGER NOT NULL DEFAULT 0;
