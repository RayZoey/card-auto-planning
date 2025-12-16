/*
  Warnings:

  - Added the required column `end_time` to the `user_and_teacher_relation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time` to the `user_and_teacher_relation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `user_and_teacher_relation` ADD COLUMN `end_time` DATETIME(3) NOT NULL,
    ADD COLUMN `start_time` DATETIME(3) NOT NULL;
