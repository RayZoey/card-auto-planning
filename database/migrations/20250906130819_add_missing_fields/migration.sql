-- AlterTable
ALTER TABLE `user_study_config` ADD COLUMN `long_break_duration` INTEGER NOT NULL DEFAULT 15,
    ADD COLUMN `long_break_interval` INTEGER NOT NULL DEFAULT 4,
    ADD COLUMN `max_daily_minutes` INTEGER NOT NULL DEFAULT 480,
    ADD COLUMN `pomodoro_duration` INTEGER NOT NULL DEFAULT 25,
    ADD COLUMN `short_break_duration` INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE `user_task` ADD COLUMN `is_manually_adjusted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `original_planned_date` DATE NULL;
