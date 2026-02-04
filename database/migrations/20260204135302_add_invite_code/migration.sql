-- CreateTable
CREATE TABLE `invite_code` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(16) NOT NULL,
    `status` ENUM('ENABLE', 'USED', 'DISABLE') NOT NULL DEFAULT 'ENABLE',
    `used_by_user_id` INTEGER NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `invite_code_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `invite_code` ADD CONSTRAINT `invite_code_used_by_user_id_fkey` FOREIGN KEY (`used_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
