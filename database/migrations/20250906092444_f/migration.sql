-- AlterTable
ALTER TABLE `user_task` ADD COLUMN `planned_date` DATE NULL,
    ADD COLUMN `seq` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `user_plan_operation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `plan_id` INTEGER NOT NULL,
    `operation` ENUM('INSERT_TASK', 'CUT_TASK', 'SKIP_TASK', 'POSTPONE_TASK', 'UPDATE_PLAN') NOT NULL,
    `payload` JSON NULL,
    `before_snapshot` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_plan_operation_user_id_plan_id_created_at_idx`(`user_id`, `plan_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_study_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `plan_type` ENUM('CUSTOM', 'AVG_HOUR') NOT NULL DEFAULT 'CUSTOM',
    `avg_hour_per_day` DOUBLE NULL,
    `auto_plan_mode` ENUM('MODE1', 'MODE2', 'MODE3', 'MODE4', 'MODE5') NOT NULL DEFAULT 'MODE1',
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_study_config_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_daily_task` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `user_task_id` INTEGER NOT NULL,
    `planned_minutes` INTEGER NOT NULL,
    `done_minutes` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('PLANNED', 'AHEAD', 'DELAY', 'GIVE_UP') NOT NULL DEFAULT 'PLANNED',
    `seq` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_daily_task_user_id_date_idx`(`user_id`, `date`),
    UNIQUE INDEX `user_daily_task_user_id_date_user_task_id_key`(`user_id`, `date`, `user_task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_task_segment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_task_id` INTEGER NOT NULL,
    `segment_index` INTEGER NOT NULL,
    `total_minutes` INTEGER NOT NULL,
    `daily_task_id` INTEGER NULL,

    UNIQUE INDEX `user_task_segment_user_task_id_segment_index_key`(`user_task_id`, `segment_index`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_plan_operation` ADD CONSTRAINT `user_plan_operation_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_study_config` ADD CONSTRAINT `user_study_config_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_daily_task` ADD CONSTRAINT `user_daily_task_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_daily_task` ADD CONSTRAINT `user_daily_task_user_task_id_fkey` FOREIGN KEY (`user_task_id`) REFERENCES `user_task`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_task_segment` ADD CONSTRAINT `user_task_segment_user_task_id_fkey` FOREIGN KEY (`user_task_id`) REFERENCES `user_task`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_task_segment` ADD CONSTRAINT `user_task_segment_daily_task_id_fkey` FOREIGN KEY (`daily_task_id`) REFERENCES `user_daily_task`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
