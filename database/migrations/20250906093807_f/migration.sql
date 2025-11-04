/*
  Warnings:

  - Added the required column `plan_id` to the `user_daily_task` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `user_daily_task` ADD COLUMN `plan_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `user_daily_task` ADD CONSTRAINT `user_daily_task_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `user_plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
