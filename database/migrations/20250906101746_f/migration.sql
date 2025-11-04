-- AlterTable
ALTER TABLE `user_task` ADD COLUMN `plan_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `user_task` ADD CONSTRAINT `user_task_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `user_plan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
