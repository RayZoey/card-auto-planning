/*
  Warnings:

  - You are about to drop the column `long_break_duration` on the `user_study_config` table. All the data in the column will be lost.
  - You are about to drop the column `long_break_interval` on the `user_study_config` table. All the data in the column will be lost.
  - You are about to drop the column `pomodoro_duration` on the `user_study_config` table. All the data in the column will be lost.
  - You are about to drop the column `short_break_duration` on the `user_study_config` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user_study_config` DROP COLUMN `long_break_duration`,
    DROP COLUMN `long_break_interval`,
    DROP COLUMN `pomodoro_duration`,
    DROP COLUMN `short_break_duration`;
