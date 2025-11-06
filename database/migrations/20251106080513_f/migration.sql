/*
  Warnings:

  - You are about to drop the `plan_template_and_task_group_relation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `plan_template_and_task_group_relation` DROP FOREIGN KEY `plan_template_and_task_group_relation_plan_template_id_fkey`;

-- DropForeignKey
ALTER TABLE `plan_template_and_task_group_relation` DROP FOREIGN KEY `plan_template_and_task_group_relation_platform_task_group_i_fkey`;

-- AlterTable
ALTER TABLE `platform_task_group_and_task_relation` ADD COLUMN `group_sort` INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE `plan_template_and_task_group_relation`;

-- CreateTable
CREATE TABLE `plan_template_detail` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_template_id` INTEGER NOT NULL,
    `platform_task_id` INTEGER NOT NULL,
    `platform_task_group_id` INTEGER NULL,
    `priority` INTEGER NOT NULL DEFAULT 9999,
    `global_sort` INTEGER NOT NULL DEFAULT 0,
    `group_sort` INTEGER NOT NULL DEFAULT 0,
    `can_divisible` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `plan_template_detail` ADD CONSTRAINT `plan_template_detail_plan_template_id_fkey` FOREIGN KEY (`plan_template_id`) REFERENCES `plan_template`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plan_template_detail` ADD CONSTRAINT `plan_template_detail_platform_task_id_fkey` FOREIGN KEY (`platform_task_id`) REFERENCES `platform_task`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plan_template_detail` ADD CONSTRAINT `plan_template_detail_platform_task_group_id_fkey` FOREIGN KEY (`platform_task_group_id`) REFERENCES `platform_task_group`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
