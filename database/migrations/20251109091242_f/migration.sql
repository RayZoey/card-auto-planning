/*
  Warnings:

  - You are about to drop the column `priority` on the `user_task` table. All the data in the column will be lost.
  - You are about to drop the column `sort_order` on the `user_task` table. All the data in the column will be lost.
  - You are about to drop the column `plan_id` on the `user_task_group` table. All the data in the column will be lost.
  - You are about to drop the `user_plan_operation` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `plan_id` to the `user_task` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `user_plan_operation` DROP FOREIGN KEY `user_plan_operation_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_task_group` DROP FOREIGN KEY `user_task_group_plan_id_fkey`;

-- AlterTable
ALTER TABLE `user_plan` ADD COLUMN `total_days` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `user_task` DROP COLUMN `priority`,
    DROP COLUMN `sort_order`,
    ADD COLUMN `plan_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `user_task_group` DROP COLUMN `plan_id`;

-- DropTable
DROP TABLE `user_plan_operation`;

-- CreateTable
CREATE TABLE `user_task_scheduler` (
    `task_id` INTEGER NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 9999,
    `global_sort` INTEGER NOT NULL DEFAULT 1,
    `group_sort` INTEGER NOT NULL DEFAULT 1,
    `day_sort` INTEGER NOT NULL DEFAULT 1,
    `can_divisible` BOOLEAN NOT NULL DEFAULT false,
    `date_no` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `user_task_scheduler_task_id_key`(`task_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_task` ADD CONSTRAINT `user_task_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `user_plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
