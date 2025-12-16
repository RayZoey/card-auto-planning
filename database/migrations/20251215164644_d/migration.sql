/*
  Warnings:

  - You are about to drop the column `end_time` on the `user_and_teacher_relation` table. All the data in the column will be lost.
  - You are about to drop the column `start_time` on the `user_and_teacher_relation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user_and_teacher_relation` DROP COLUMN `end_time`,
    DROP COLUMN `start_time`;
