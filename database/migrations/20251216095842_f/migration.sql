/*
  Warnings:

  - You are about to drop the column `track_id` on the `user_task_scheduler` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `user_task_scheduler` DROP FOREIGN KEY `user_task_scheduler_track_id_fkey`;

-- AlterTable
ALTER TABLE `user_task_scheduler` DROP COLUMN `track_id`;
