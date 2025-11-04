/*
  Warnings:

  - Made the column `plan_id` on table `user_task` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `user_task` DROP FOREIGN KEY `user_task_plan_id_fkey`;

-- AlterTable
ALTER TABLE `user_task` MODIFY `plan_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `user_task` ADD CONSTRAINT `user_task_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `user_plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
