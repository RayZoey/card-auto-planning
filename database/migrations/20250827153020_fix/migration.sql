/*
  Warnings:

  - Added the required column `name` to the `user_plan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `plan_template` ADD COLUMN `is_enable` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `user_plan` ADD COLUMN `name` VARCHAR(80) NOT NULL;
