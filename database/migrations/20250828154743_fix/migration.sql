/*
  Warnings:

  - A unique constraint covering the columns `[user_id,teacher_id]` on the table `user_and_teacher_relation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `user_and_teacher_relation_user_id_teacher_id_key` ON `user_and_teacher_relation`(`user_id`, `teacher_id`);
