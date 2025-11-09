/*
  Warnings:

  - You are about to drop the column `total_time` on the `plan_template` table. All the data in the column will be lost.
  - Added the required column `total_days` to the `plan_template` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `plan_template` DROP COLUMN `total_time`,
    ADD COLUMN `total_days` INTEGER NOT NULL;
