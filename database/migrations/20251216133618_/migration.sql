/*
  Warnings:

  - You are about to drop the column `tag_id` on the `platform_task` table. All the data in the column will be lost.
  - You are about to drop the column `tag_id` on the `user_task` table. All the data in the column will be lost.
  - You are about to drop the `platform_task_tag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_task_tag` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `platform_task` DROP FOREIGN KEY `platform_task_tag_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_task` DROP FOREIGN KEY `user_task_tag_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_task_tag` DROP FOREIGN KEY `user_task_tag_user_id_fkey`;

-- AlterTable
ALTER TABLE `platform_task` DROP COLUMN `tag_id`,
    ADD COLUMN `preset_task_tag_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `user_task` DROP COLUMN `tag_id`,
    ADD COLUMN `preset_task_tag_id` INTEGER NULL;

-- DropTable
DROP TABLE `platform_task_tag`;

-- DropTable
DROP TABLE `user_task_tag`;

-- CreateTable
CREATE TABLE `preset_task_tag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tag_name` VARCHAR(80) NOT NULL,
    `tag_icon` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `platform_task` ADD CONSTRAINT `platform_task_preset_task_tag_id_fkey` FOREIGN KEY (`preset_task_tag_id`) REFERENCES `preset_task_tag`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_task` ADD CONSTRAINT `user_task_preset_task_tag_id_fkey` FOREIGN KEY (`preset_task_tag_id`) REFERENCES `preset_task_tag`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
