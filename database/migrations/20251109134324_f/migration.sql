/*
  Warnings:

  - Made the column `limit_hour` on table `plan_template` required. This step will fail if there are existing NULL values in that column.
  - Made the column `limit_hour` on table `user_plan` required. This step will fail if there are existing NULL values in that column.
  - Made the column `occupation_time` on table `user_task` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `plan_template` ADD COLUMN `total_time` INTEGER NOT NULL DEFAULT 0,
    MODIFY `limit_hour` JSON NOT NULL;

-- AlterTable
ALTER TABLE `user_plan` ADD COLUMN `total_time` INTEGER NOT NULL DEFAULT 0,
    MODIFY `limit_hour` JSON NOT NULL;

-- AlterTable
ALTER TABLE `user_task` MODIFY `occupation_time` INTEGER NOT NULL;
