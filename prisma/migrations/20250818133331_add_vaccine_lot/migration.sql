-- CreateTable
CREATE TABLE `vaccine_lot` (
    `lotNo` VARCHAR(50) NOT NULL,
    `vaccineId` INTEGER NOT NULL,
    `expirationDate` DATETIME(3) NOT NULL,
    `batchNumber` VARCHAR(50) NULL,
    `serialNumber` VARCHAR(50) NULL,
    `status` ENUM('USABLE', 'EXPIRED', 'NEAR_EXPIRE') NOT NULL DEFAULT 'USABLE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vaccine_lot_vaccineId_idx`(`vaccineId`),
    INDEX `vaccine_lot_expirationDate_idx`(`expirationDate`),
    PRIMARY KEY (`lotNo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vaccine_lot` ADD CONSTRAINT `vaccine_lot_vaccineId_fkey` FOREIGN KEY (`vaccineId`) REFERENCES `cine_table`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
