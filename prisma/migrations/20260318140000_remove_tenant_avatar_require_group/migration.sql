-- DropTable
DROP TABLE `TenantAvatar`;

-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_groupId_fkey`;

-- AlterTable
ALTER TABLE `User` MODIFY `groupId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_groupId_email_key` ON `User`(`groupId`, `email`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
