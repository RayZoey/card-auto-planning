/*
  Warnings:

  - Added the required column `plan_id` to the `user_task_group` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plan_id` to the `user_task_scheduler` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `user_task_group` ADD COLUMN `plan_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `user_task_scheduler` ADD COLUMN `plan_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `user_task_group` ADD CONSTRAINT `user_task_group_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `user_plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_task_scheduler` ADD CONSTRAINT `user_task_scheduler_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `user_plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
