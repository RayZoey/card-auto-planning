-- AlterTable
ALTER TABLE `plan_template_detail` MODIFY `can_divisible` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `platform_task_group_and_task_relation` MODIFY `can_divisible` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `user_task` MODIFY `can_divisible` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `user_task_scheduler` MODIFY `can_divisible` BOOLEAN NOT NULL DEFAULT true;
