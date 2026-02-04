-- Move background from tasks to task-groups

-- 1) Add background to task groups (default blue)
ALTER TABLE `platform_task_group`
  ADD COLUMN `background` VARCHAR(10) NOT NULL DEFAULT '#0000FF';

ALTER TABLE `user_task_group`
  ADD COLUMN `background` VARCHAR(10) NOT NULL DEFAULT '#0000FF';

-- 2) Drop background from tasks
ALTER TABLE `platform_task` DROP COLUMN `background`;

ALTER TABLE `user_task` DROP COLUMN `background`;

