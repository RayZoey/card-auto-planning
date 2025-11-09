-- AddForeignKey
ALTER TABLE `user_task_scheduler` ADD CONSTRAINT `user_task_scheduler_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `user_task`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
