/*
  Warnings:

  - You are about to drop the `task_tag` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `task_tag` DROP FOREIGN KEY `task_tag_user_id_fkey`;

-- AlterTable
ALTER TABLE `platform_task` ADD COLUMN `tag_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `user_task` ADD COLUMN `tag_id` INTEGER NULL;

-- DropTable
DROP TABLE `task_tag`;

-- CreateTable
CREATE TABLE `platform_task_tag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tag_name` VARCHAR(80) NOT NULL,
    `tag_icon` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_task_tag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `tag_name` VARCHAR(80) NOT NULL,
    `tag_icon` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_task_tag` ADD CONSTRAINT `user_task_tag_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_task` ADD CONSTRAINT `platform_task_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `platform_task_tag`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_task` ADD CONSTRAINT `user_task_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `user_task_tag`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
