-- AlterTable
ALTER TABLE `Session` ADD COLUMN `durationSeconds` INTEGER NULL;

-- Backfill existing rows: durationSeconds = durationMinutes * 60
UPDATE `Session` SET `durationSeconds` = `durationMinutes` * 60 WHERE `durationSeconds` IS NULL;
