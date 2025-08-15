-- CreateTable
CREATE TABLE `r_account` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(40) NOT NULL,
    `display_name` VARCHAR(40) NOT NULL,
    `password` VARCHAR(200) NOT NULL,
    `role_id` INTEGER NOT NULL,
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `latest_login_ip` VARCHAR(191) NULL,
    `latest_login_time` DATETIME(3) NULL,
    `phone` VARCHAR(20) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `r_account_username_key`(`username`),
    UNIQUE INDEX `r_account_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `r_permission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(40) NOT NULL,
    `desc` VARCHAR(40) NOT NULL,
    `permission_type` ENUM('MENU', 'BUTTON', 'OTHER') NOT NULL DEFAULT 'MENU',
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `r_permission_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `r_role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(40) NOT NULL,
    `desc` VARCHAR(40) NOT NULL,
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `r_role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `r_role_permission_relation` (
    `permission_id` INTEGER NOT NULL,
    `role_id` INTEGER NOT NULL,

    UNIQUE INDEX `r_role_permission_relation_permission_id_role_id_key`(`permission_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(80) NULL,
    `avatar` VARCHAR(200) NULL,
    `phone` VARCHAR(20) NULL,
    `open_id` VARCHAR(80) NOT NULL,
    `point` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `val` TEXT NOT NULL,
    `remark` VARCHAR(20) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `system_config_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `r_account` ADD CONSTRAINT `r_account_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `r_role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `r_role_permission_relation` ADD CONSTRAINT `r_role_permission_relation_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `r_permission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `r_role_permission_relation` ADD CONSTRAINT `r_role_permission_relation_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `r_role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
