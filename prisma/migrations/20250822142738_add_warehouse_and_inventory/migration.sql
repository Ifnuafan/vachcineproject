-- CreateTable
CREATE TABLE `Warehouse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `type` ENUM('MAIN', 'SUB') NOT NULL,
    `note` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Warehouse_type_idx`(`type`),
    UNIQUE INDEX `Warehouse_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VaccineInventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `lotNo` VARCHAR(191) NOT NULL,
    `action` ENUM('RECEIVE', 'TRANSFER', 'ISSUE', 'DISPOSE') NOT NULL,
    `sourceWarehouseId` INTEGER NULL,
    `targetWarehouseId` INTEGER NULL,
    `quantity` INTEGER NOT NULL,
    `transactionDate` DATETIME(3) NOT NULL,
    `remarks` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `VaccineInventory_lotNo_idx`(`lotNo`),
    INDEX `VaccineInventory_userId_idx`(`userId`),
    INDEX `VaccineInventory_action_idx`(`action`),
    INDEX `VaccineInventory_transactionDate_idx`(`transactionDate`),
    INDEX `VaccineInventory_sourceWarehouseId_idx`(`sourceWarehouseId`),
    INDEX `VaccineInventory_targetWarehouseId_idx`(`targetWarehouseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VaccineInventory` ADD CONSTRAINT `VaccineInventory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VaccineInventory` ADD CONSTRAINT `VaccineInventory_lotNo_fkey` FOREIGN KEY (`lotNo`) REFERENCES `vaccine_lot`(`lotNo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VaccineInventory` ADD CONSTRAINT `VaccineInventory_sourceWarehouseId_fkey` FOREIGN KEY (`sourceWarehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VaccineInventory` ADD CONSTRAINT `VaccineInventory_targetWarehouseId_fkey` FOREIGN KEY (`targetWarehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
