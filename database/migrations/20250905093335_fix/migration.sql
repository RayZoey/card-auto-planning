-- CreateTable
CREATE TABLE `user_task_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_task_id` INTEGER NOT NULL,
    `from_status` ENUM('WAITING', 'PROGRESS', 'PAUSE', 'COMPLETE', 'SKIP') NOT NULL,
    `to_status` ENUM('WAITING', 'PROGRESS', 'PAUSE', 'COMPLETE', 'SKIP') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_task_log` ADD CONSTRAINT `user_task_log_user_task_id_fkey` FOREIGN KEY (`user_task_id`) REFERENCES `user_task`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
