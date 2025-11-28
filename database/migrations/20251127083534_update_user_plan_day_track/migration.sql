-- CreateTable
CREATE TABLE `user_plan_day_track` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_id` INTEGER NOT NULL,
    `date_no` INTEGER NOT NULL,
    `is_complete` BOOLEAN NOT NULL DEFAULT false,
    `completed_at` DATETIME(3) NULL,
    `total_time` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_plan_day_track_plan_id_date_no_key`(`plan_id`, `date_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_plan_day_track` ADD CONSTRAINT `user_plan_day_track_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `user_plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
