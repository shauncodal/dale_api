-- AlterTable
ALTER TABLE `PlatformSettings` ADD COLUMN `costPerMinuteDollars` DECIMAL(10, 4) NULL;

-- CreateTable
CREATE TABLE `TenantInvoice` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `users` INTEGER NOT NULL,
    `months` INTEGER NOT NULL,
    `minutesPerMonthPerUser` INTEGER NOT NULL,
    `pricePerMonthPerUser` DECIMAL(10, 2) NOT NULL,
    `minutesTotal` INTEGER NOT NULL,
    `amountDollars` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TenantInvoice_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TenantInvoice` ADD CONSTRAINT `TenantInvoice_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
