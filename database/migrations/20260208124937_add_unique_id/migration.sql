/*
  Warnings:

  - A unique constraint covering the columns `[union_id]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `union_id` VARCHAR(80) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `user_union_id_key` ON `user`(`union_id`);
