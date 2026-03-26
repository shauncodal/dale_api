-- AlterTable
ALTER TABLE `AdminUser` ADD COLUMN `termsConsentAt` DATETIME(3) NULL,
    ADD COLUMN `termsConsentVersion` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `termsConsentAt` DATETIME(3) NULL,
    ADD COLUMN `termsConsentVersion` VARCHAR(191) NULL;
