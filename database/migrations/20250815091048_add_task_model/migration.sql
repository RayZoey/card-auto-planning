-- CreateTable
CREATE TABLE `user_plan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `status` ENUM('PROGRESS', 'PAUSE', 'COMPLETE') NOT NULL DEFAULT 'PROGRESS',
    `planned_start_time` DATETIME(3) NOT NULL,
    `planned_end_time` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_tag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `tag_name` VARCHAR(80) NOT NULL,
    `tag_icon` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_task_group` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_task` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `task_group_id` INTEGER NOT NULL,
    `priority` INTEGER NOT NULL,
    `background` VARCHAR(10) NULL,
    `suggested_time_start` VARCHAR(20) NULL,
    `suggested_time_end` VARCHAR(20) NULL,
    `remark` TEXT NULL,
    `annex_type` ENUM('IMG', 'FILE', 'URL') NULL,
    `annex` VARCHAR(80) NULL,
    `timing_type` ENUM('POMODORO', 'FREE_TIMING', 'UNTIMING') NOT NULL DEFAULT 'POMODORO',
    `occupation_time` INTEGER NULL,
    `can_divisible` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_task_group` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `plan_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_task` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `task_group_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `priority` INTEGER NOT NULL,
    `background` VARCHAR(10) NULL,
    `suggested_time_start` VARCHAR(20) NULL,
    `suggested_time_end` VARCHAR(20) NULL,
    `remark` TEXT NULL,
    `annex_type` ENUM('IMG', 'FILE', 'URL') NULL,
    `annex` VARCHAR(80) NULL,
    `timing_type` ENUM('POMODORO', 'FREE_TIMING', 'UNTIMING') NOT NULL DEFAULT 'POMODORO',
    `occupation_time` INTEGER NULL,
    `actual_time` INTEGER NULL,
    `actual_time_start` DATETIME(3) NULL,
    `actual_time_end` DATETIME(3) NULL,
    `status` ENUM('WAITING', 'PROGRESS', 'PAUSE', 'COMPLETE') NOT NULL DEFAULT 'WAITING',
    `can_divisible` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teacher` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `avatar` VARCHAR(200) NULL,
    `desc` TEXT NOT NULL,
    `contact` VARCHAR(80) NOT NULL,
    `order` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_plan` ADD CONSTRAINT `user_plan_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_tag` ADD CONSTRAINT `task_tag_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_task` ADD CONSTRAINT `platform_task_task_group_id_fkey` FOREIGN KEY (`task_group_id`) REFERENCES `platform_task_group`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_task_group` ADD CONSTRAINT `user_task_group_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_task_group` ADD CONSTRAINT `user_task_group_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `user_plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_task` ADD CONSTRAINT `user_task_task_group_id_fkey` FOREIGN KEY (`task_group_id`) REFERENCES `user_task_group`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_task` ADD CONSTRAINT `user_task_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
