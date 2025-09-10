// prisma/seed.ts
import {
  PrismaClient,
  UserRole,
  WarehouseType,
  Gender,
  InventoryAction,
  VaccinationStatus,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Seeding start')

  // ========= Users =========
  const adminPass = await bcrypt.hash('admin123', 10)
  const staffPass = await bcrypt.hash('staff123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@example.com',
      password: adminPass,
      role: UserRole.ADMIN,
    },
  })

  const staff = await prisma.user.upsert({
    where: { email: 'staff@example.com' },
    update: {},
    create: {
      name: 'Staff',
      email: 'staff@example.com',
      password: staffPass,
      role: UserRole.STAFF,
    },
  })

  console.log('✅ Users:', await prisma.user.count())

  // ========= Warehouses =========
  const mainWh = await prisma.warehouse.upsert({
    where: { name: 'คลังกลาง' },
    update: {},
    create: { name: 'คลังกลาง', type: WarehouseType.MAIN, note: 'ศูนย์รวมสต็อก' },
  })

  const subWh = await prisma.warehouse.upsert({
    where: { name: 'คลังย่อย' },
    update: {},
    create: { name: 'คลังย่อย', type: WarehouseType.SUB, note: 'หน่วยบริการ' },
  })

  console.log('✅ Warehouses:', await prisma.warehouse.count())

  // ========= Patients =========
  await prisma.patient.createMany({
    data: [
      {
        fullName: 'เเบมะ จาเเบปะ',
        birthDate: new Date('1995-03-15'),
        gender: Gender.MALE,
        cid: '1234567890123',
        address: '123 ม.1 ต.ยะรัง อ.ยะรัง',
        phone: '0812345678',
        allergies: 'แพ้เธอ',
        underlyingConditions: 'เบาหวาน',
      },
      {
        fullName: 'ปัง มาเล',
        birthDate: new Date('2002-08-20'),
        gender: Gender.FEMALE,
        cid: '9876543210987',
        address: '45/7 ต.ยาบี อ.หนองจิก',
        phone: '0891112222',
        allergies: null,
        underlyingConditions: 'หอบหืด',
      },
    ],
    skipDuplicates: true,
  })

  const p1 = await prisma.patient.findUnique({ where: { cid: '1234567890123' } })
  const p2 = await prisma.patient.findUnique({ where: { cid: '9876543210987' } })

  console.log('✅ Patients:', await prisma.patient.count())

  // ========= Vaccines (cine_table) =========
  await prisma.vaccine.createMany({
    data: [
      { name: 'MMR', type: 'LIVE', requiredDoses: 2, usageType: 'ROUTINE' },
      { name: 'HepB', type: 'INACTIVATED', requiredDoses: 3, usageType: 'ROUTINE' },
      { name: 'DTP', type: 'TOXOID', requiredDoses: 5, usageType: 'ROUTINE' },
    ],
    skipDuplicates: true,
  })

  const mmr = await prisma.vaccine.findFirst({ where: { name: 'MMR' } })
  const hepb = await prisma.vaccine.findFirst({ where: { name: 'HepB' } })
  const dtp = await prisma.vaccine.findFirst({ where: { name: 'DTP' } })

  console.log('✅ Vaccines:', await prisma.vaccine.count())

  // ========= Vaccine Lots =========
  // สร้างเฉพาะเมื่อมี vaccine พร้อมใช้งาน
  if (mmr && hepb && dtp) {
    await prisma.vaccineLot.createMany({
      data: [
        {
          lotNo: 'MMR-001',
          vaccineId: mmr.id,
          expirationDate: new Date('2026-12-31'),
          batchNumber: 'B-MMR-001',
          serialNumber: 'S-MMR-001',
          status: 'USABLE',
        },
        {
          lotNo: 'HEPB-001',
          vaccineId: hepb.id,
          expirationDate: new Date('2026-06-30'),
          batchNumber: 'B-HEPB-001',
          serialNumber: 'S-HEPB-001',
          status: 'USABLE',
        },
        {
          lotNo: 'DTP-001',
          vaccineId: dtp.id,
          expirationDate: new Date('2026-09-30'),
          batchNumber: 'B-DTP-001',
          serialNumber: 'S-DTP-001',
          status: 'USABLE',
        },
      ],
      skipDuplicates: true,
    })
  }

  console.log('✅ VaccineLots:', await prisma.vaccineLot.count())

  // ========= Vaccination Records =========
  if (p1 && p2 && mmr && hepb) {
    await prisma.vaccinationRecord.createMany({
      data: [
        {
          patientId: p1.id,
          vaccineId: mmr.id,
          lotNo: 'MMR-001',
          vaccinationDate: new Date('2025-08-20'),
          doseNumber: 1,
          injectionSite: 'L-Deltoid',
          status: VaccinationStatus.COMPLETED,
          provider: 'รพ.สต.ตัวอย่าง',
          remarks: 'เข็มแรก',
        },
        {
          patientId: p2.id,
          vaccineId: hepb.id,
          lotNo: 'HEPB-001',
          vaccinationDate: new Date('2025-08-22'),
          doseNumber: 1,
          injectionSite: 'R-Deltoid',
          status: VaccinationStatus.COMPLETED,
          provider: 'รพ.สต.ตัวอย่าง',
          remarks: 'ไม่มีอาการข้างเคียง',
        },
      ],
      skipDuplicates: true,
    })
  }

  console.log('✅ VaccinationRecords:', await prisma.vaccinationRecord.count())

  // ========= Inventory Movements =========
  // รับล็อตเข้าคลังกลาง
  await prisma.vaccineInventory.createMany({
    data: [
      {
        userId: admin.id,
        lotNo: 'MMR-001',
        action: InventoryAction.RECEIVE,
        sourceWarehouseId: null,
        targetWarehouseId: mainWh.id,
        quantity: 100,
        transactionDate: new Date('2025-08-18'),
        remarks: 'รับล็อตเข้าคลังกลาง',
      },
      {
        userId: admin.id,
        lotNo: 'HEPB-001',
        action: InventoryAction.RECEIVE,
        sourceWarehouseId: null,
        targetWarehouseId: mainWh.id,
        quantity: 80,
        transactionDate: new Date('2025-08-18'),
        remarks: 'รับล็อตเข้าคลังกลาง',
      },
      {
        userId: staff.id,
        lotNo: 'DTP-001',
        action: InventoryAction.RECEIVE,
        sourceWarehouseId: null,
        targetWarehouseId: mainWh.id,
        quantity: 60,
        transactionDate: new Date('2025-08-19'),
        remarks: 'รับล็อตเข้าคลังกลาง',
      },
    ],
    skipDuplicates: true,
  })

  // โอนบางส่วนไปคลังย่อย
  await prisma.vaccineInventory.createMany({
    data: [
      {
        userId: admin.id,
        lotNo: 'MMR-001',
        action: InventoryAction.TRANSFER,
        sourceWarehouseId: mainWh.id,
        targetWarehouseId: subWh.id,
        quantity: 20,
        transactionDate: new Date('2025-08-21'),
        remarks: 'โอน MMR ไปคลังย่อย',
      },
      {
        userId: admin.id,
        lotNo: 'HEPB-001',
        action: InventoryAction.TRANSFER,
        sourceWarehouseId: mainWh.id,
        targetWarehouseId: subWh.id,
        quantity: 15,
        transactionDate: new Date('2025-08-21'),
        remarks: 'โอน HepB ไปคลังย่อย',
      },
    ],
    skipDuplicates: true,
  })

  // เบิกใช้งาน (ISSUE) จากคลังย่อย
  await prisma.vaccineInventory.createMany({
    data: [
      {
        userId: staff.id,
        lotNo: 'MMR-001',
        action: InventoryAction.ISSUE,
        sourceWarehouseId: subWh.id,
        targetWarehouseId: null,
        quantity: 2,
        transactionDate: new Date('2025-08-22'),
        remarks: 'ใช้ฉีดผู้ป่วย',
      },
    ],
    skipDuplicates: true,
  })

  console.log('✅ VaccineInventory:', await prisma.vaccineInventory.count())

  console.log('🎉 Seeding done')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
