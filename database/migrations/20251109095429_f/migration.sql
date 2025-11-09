-- AlterTable
ALTER TABLE `plan_template` ADD COLUMN `limit_hour` JSON NULL;

-- AlterTable
ALTER TABLE `user_plan` ADD COLUMN `limit_hour` JSON NULL;
