/*
  Warnings:

  - You are about to drop the column `task_group_id` on the `platform_task` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `platform_task` DROP FOREIGN KEY `platform_task_task_group_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_task` DROP FOREIGN KEY `user_task_task_group_id_fkey`;

-- AlterTable
ALTER TABLE `platform_task` DROP COLUMN `task_group_id`;

-- AlterTable
ALTER TABLE `user_task` MODIFY `task_group_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `platform_task_group_and_task_relation` (
    `platform_task_group_id` INTEGER NOT NULL,
    `platform_task_id` INTEGER NOT NULL,

    UNIQUE INDEX `platform_task_group_and_task_relation_platform_task_group_id_key`(`platform_task_group_id`, `platform_task_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `platform_task_group_and_task_relation` ADD CONSTRAINT `platform_task_group_and_task_relation_platform_task_group_i_fkey` FOREIGN KEY (`platform_task_group_id`) REFERENCES `platform_task_group`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_task_group_and_task_relation` ADD CONSTRAINT `platform_task_group_and_task_relation_platform_task_id_fkey` FOREIGN KEY (`platform_task_id`) REFERENCES `platform_task`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_task` ADD CONSTRAINT `user_task_task_group_id_fkey` FOREIGN KEY (`task_group_id`) REFERENCES `user_task_group`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
