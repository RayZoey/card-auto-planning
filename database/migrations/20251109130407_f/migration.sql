/*
  Warnings:

  - Made the column `occupation_time` on table `platform_task` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `platform_task` MODIFY `occupation_time` INTEGER NOT NULL;
