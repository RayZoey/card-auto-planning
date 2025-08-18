-- CreateTable
CREATE TABLE `plan_template` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `total_time` INTEGER NOT NULL,
    `remark` VARCHAR(20) NULL,
    `total_use` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan_template_and_task_group_relation` (
    `plan_template_id` INTEGER NOT NULL,
    `platform_task_group_id` INTEGER NOT NULL,

    UNIQUE INDEX `plan_template_and_task_group_relation_plan_template_id_platf_key`(`plan_template_id`, `platform_task_group_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `plan_template_and_task_group_relation` ADD CONSTRAINT `plan_template_and_task_group_relation_plan_template_id_fkey` FOREIGN KEY (`plan_template_id`) REFERENCES `plan_template`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plan_template_and_task_group_relation` ADD CONSTRAINT `plan_template_and_task_group_relation_platform_task_group_i_fkey` FOREIGN KEY (`platform_task_group_id`) REFERENCES `platform_task_group`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
