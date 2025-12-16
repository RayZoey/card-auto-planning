/*
  Warnings:

  - Added the required column `track_id` to the `user_task_scheduler` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `user_task_scheduler` ADD COLUMN `track_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `user_task_scheduler` ADD CONSTRAINT `user_task_scheduler_track_id_fkey` FOREIGN KEY (`track_id`) REFERENCES `user_plan_day_track`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
