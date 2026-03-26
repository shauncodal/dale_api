-- AlterTable
ALTER TABLE `Tenant` ADD COLUMN `minutesPurchased` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `pricePer30MinDollars` DECIMAL(10, 2) NULL;

-- CreateTable
CREATE TABLE `PlatformSettings` (
    `id` VARCHAR(191) NOT NULL,
    `costPer30MinAvatarDollars` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `infrastructureCostDollars` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
