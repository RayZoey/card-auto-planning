/*
  Warnings:

  - You are about to drop the `user_daily_task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_study_config` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_task_segment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `user_daily_task` DROP FOREIGN KEY `user_daily_task_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_daily_task` DROP FOREIGN KEY `user_daily_task_user_task_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_study_config` DROP FOREIGN KEY `user_study_config_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_task_segment` DROP FOREIGN KEY `user_task_segment_daily_task_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_task_segment` DROP FOREIGN KEY `user_task_segment_user_task_id_fkey`;

-- DropTable
DROP TABLE `user_daily_task`;

-- DropTable
DROP TABLE `user_study_config`;

-- DropTable
DROP TABLE `user_task_segment`;
