-- CreateTable
CREATE TABLE `vaccination_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `patientId` INTEGER NOT NULL,
    `vaccineId` INTEGER NOT NULL,
    `lotNo` VARCHAR(191) NOT NULL,
    `vaccinationDate` DATETIME(3) NOT NULL,
    `doseNumber` INTEGER NULL,
    `injectionSite` VARCHAR(50) NULL,
    `status` ENUM('COMPLETED', 'POSTPONED', 'CANCELED') NOT NULL DEFAULT 'COMPLETED',
    `provider` VARCHAR(100) NULL,
    `remarks` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vaccination_records_vaccinationDate_vaccineId_patientId_lotN_idx`(`vaccinationDate`, `vaccineId`, `patientId`, `lotNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vaccination_records` ADD CONSTRAINT `vaccination_records_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vaccination_records` ADD CONSTRAINT `vaccination_records_vaccineId_fkey` FOREIGN KEY (`vaccineId`) REFERENCES `cine_table`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vaccination_records` ADD CONSTRAINT `vaccination_records_lotNo_fkey` FOREIGN KEY (`lotNo`) REFERENCES `vaccine_lot`(`lotNo`) ON DELETE RESTRICT ON UPDATE CASCADE;
