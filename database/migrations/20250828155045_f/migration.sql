/*
  Warnings:

  - You are about to drop the column `is_enable` on the `user_and_teacher_relation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `teacher` ADD COLUMN `is_enable` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `user_and_teacher_relation` DROP COLUMN `is_enable`,
    ADD COLUMN `is_expired` BOOLEAN NOT NULL DEFAULT false;
