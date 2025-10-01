-- CreateTable
CREATE TABLE `open_vial` (
    `warehouseId` INTEGER NOT NULL,
    `lotNo` VARCHAR(50) NOT NULL,
    `dosesTotal` INTEGER NOT NULL,
    `dosesUsed` INTEGER NOT NULL DEFAULT 0,
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `open_vial_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`warehouseId`, `lotNo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `open_vial` ADD CONSTRAINT `open_vial_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `open_vial` ADD CONSTRAINT `open_vial_lotNo_fkey` FOREIGN KEY (`lotNo`) REFERENCES `vaccine_lot`(`lotNo`) ON DELETE RESTRICT ON UPDATE CASCADE;
