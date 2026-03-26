-- AlterTable
ALTER TABLE `Tenant` ADD COLUMN `pricePerUserPerMonthDollars` DECIMAL(10, 2) NULL;

-- CreateTable
CREATE TABLE `TenantAvatar` (
    `tenantId` VARCHAR(191) NOT NULL,
    `avatarId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`tenantId`, `avatarId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `User_tenantId_email_key` ON `User`(`tenantId`, `email`);

-- AddForeignKey
ALTER TABLE `TenantAvatar` ADD CONSTRAINT `TenantAvatar_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TenantAvatar` ADD CONSTRAINT `TenantAvatar_avatarId_fkey` FOREIGN KEY (`avatarId`) REFERENCES `CoachingAvatar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
