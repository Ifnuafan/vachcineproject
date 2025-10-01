// app/api/vaccination-records/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import {
  VaccinationStatus,
  InventoryAction,
} from '@prisma/client'

/* ------------------ GET: list with filters ------------------ */
// GET /api/vaccination-records?patientId=&vaccineId=&lotNo=&page=1&limit=20
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get('patientId')
  const vaccineId = searchParams.get('vaccineId')
  const lotNo     = searchParams.get('lotNo')
  const page  = Math.max(1, Number(searchParams.get('page')  ?? 1))
  const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit') ?? 20)))
  const skip = (page - 1) * limit

  const where: any = {
    AND: [
      patientId ? { patientId: Number(patientId) } : {},
      vaccineId ? { vaccineId: Number(vaccineId) } : {},
      lotNo     ? { lotNo: String(lotNo) } : {},
    ],
  }

  const [items, total] = await Promise.all([
    prisma.vaccinationRecord.findMany({
      where,
      orderBy: { vaccinationDate: 'desc' },
      skip, take: limit,
      include: {
        patient: { select: { id: true, fullName: true, cid: true} },
        vaccine: { select: { id: true, name: true, type: true } },
        lot:     { select: { lotNo: true, expirationDate: true, status: true } },
      },
    }),
    prisma.vaccinationRecord.count({ where }),
  ])

  return NextResponse.json(
    { items, total, page, limit },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

/* ------------------ helpers ------------------ */
/** คำนวณ on-hand ต่อคลัง-ต่อล็อต จาก VaccineInventory */
async function getOnHandForWarehouseLot(warehouseId: number, lotNo: string) {
  const rows = await prisma.vaccineInventory.findMany({
    where: {
      lotNo,
      OR: [
        { targetWarehouseId: warehouseId },
        { sourceWarehouseId: warehouseId },
      ],
    },
    select: {
      action: true,
      quantity: true,
      sourceWarehouseId: true,
      targetWarehouseId: true,
    },
  })

  let sum = 0
  for (const r of rows) {
    const qty = Math.abs(r.quantity)
    switch (r.action) {
      case InventoryAction.RECEIVE:
        if (r.targetWarehouseId === warehouseId) sum += qty
        break
      case InventoryAction.ISSUE:
        if (r.targetWarehouseId === warehouseId) sum -= qty
        break
      case InventoryAction.DISPOSE:
        if (r.targetWarehouseId === warehouseId) sum -= qty
        break
      case InventoryAction.TRANSFER:
        if (r.sourceWarehouseId === warehouseId) sum -= qty
        if (r.targetWarehouseId === warehouseId) sum += qty
        break
    }
  }
  return sum
}

/** FEFO: เลือกล็อตหมดอายุเร็วสุดที่จำนวนพอ */
async function pickLotFEFO(vaccineId: number, warehouseId: number, needQty: number) {
  const lots = await prisma.vaccineLot.findMany({
    where: { vaccineId, status: 'USABLE' },
    orderBy: { expirationDate: 'asc' },
    select: { lotNo: true },
  })

  for (const lot of lots) {
    const onHand = await getOnHandForWarehouseLot(warehouseId, lot.lotNo)
    if (onHand >= needQty) return lot.lotNo
  }
  return null
}

/** แปลง usageType → จำนวนโดสต่อขวด (รองรับ "1:10", "VIAL_10", "10") */
function dosesPerVial(usageType?: string | null) {
  if (!usageType) return 1
  const onlyNum = String(usageType).match(/(\d+)/)
  const n = onlyNum ? parseInt(onlyNum[1], 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : 1
}

/* ------------------ POST: create + open-vial aware ------------------ */
// body: { patientId, vaccineId, warehouseId, quantity?, vaccinationDate, doseNumber?, injectionSite?, status?, provider?, remarks?, lotNo? }
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      patientId,
      vaccineId,
      warehouseId,
      vaccinationDate,
      quantity = 1,
      doseNumber,
      injectionSite,
      status,
      provider,
      remarks,
      lotNo, // optional
    } = body ?? {}

    if (!patientId || !vaccineId || !warehouseId || !vaccinationDate) {
      return NextResponse.json(
        { message: 'กรอกข้อมูลไม่ครบ (patientId, vaccineId, warehouseId, vaccinationDate)' },
        { status: 400 }
      )
    }
    if (Number(quantity) <= 0) {
      return NextResponse.json({ message: 'quantity ต้องมากกว่า 0' }, { status: 400 })
    }

    // ตรวจ FK
    const [p, v, wh] = await Promise.all([
      prisma.patient.findUnique({ where: { id: Number(patientId) } }),
      prisma.vaccine.findUnique({ where: { id: Number(vaccineId) } }),
      prisma.warehouse.findUnique({ where: { id: Number(warehouseId) } }),
    ])
    if (!p)  return NextResponse.json({ message: 'ไม่พบ Patient' }, { status: 404 })
    if (!v)  return NextResponse.json({ message: 'ไม่พบ Vaccine' }, { status: 404 })
    if (!wh) return NextResponse.json({ message: 'ไม่พบ Warehouse' }, { status: 404 })

    const DPER = dosesPerVial(v.usageType) // โดส/ขวด

    // safety: ป้องกันการบันทึกเกินโดสต่อขวด
    if (Number(quantity) > DPER) {
      return NextResponse.json(
        { message: `ปริมาณโดส (${quantity}) เกินจำนวนโดสต่อขวด (${DPER}) • กรุณาแบ่งบันทึกเป็นหลายรายการ` },
        { status: 400 }
      )
    }

    const created = await prisma.$transaction(async (tx) => {
      const now = new Date()

      /* ===== กรณีวัคซีน 1:1 → ตัดสต็อกตามโดสเหมือนเดิม ===== */
      if (DPER <= 1) {
        let chosenLotNo = lotNo as string | null
        if (!chosenLotNo) {
          chosenLotNo = await pickLotFEFO(Number(vaccineId), Number(warehouseId), Number(quantity))
          if (!chosenLotNo) throw new Error('สต็อกไม่พอหรือไม่มีล็อตที่ใช้งานได้ในคลังนี้')
          const onHand = await getOnHandForWarehouseLot(Number(warehouseId), chosenLotNo)
          if (onHand < Number(quantity)) throw new Error(`ล็อต ${chosenLotNo} คงเหลือไม่พอ`)
        } else {
          const lot = await tx.vaccineLot.findUnique({ where: { lotNo: String(chosenLotNo) } })
          if (!lot || lot.vaccineId !== Number(vaccineId)) {
            throw new Error('ไม่พบล็อตนี้ หรือไม่ตรงกับวัคซีนที่เลือก')
          }
          const onHand = await getOnHandForWarehouseLot(Number(warehouseId), String(chosenLotNo))
          if (onHand < Number(quantity)) throw new Error(`ล็อต ${chosenLotNo} คงเหลือไม่พอ`)
        }

        const rec = await tx.vaccinationRecord.create({
          data: {
            patientId: Number(patientId),
            vaccineId: Number(vaccineId),
            lotNo: String(chosenLotNo),
            vaccinationDate: new Date(vaccinationDate),
            doseNumber: doseNumber ? Number(doseNumber) : null,
            injectionSite: injectionSite ?? null,
            status:
              status && Object.values(VaccinationStatus).includes(status)
                ? status
                : VaccinationStatus.COMPLETED,
            provider: provider ?? null,
            remarks: remarks ?? null,
          },
        })

        await tx.vaccineInventory.create({
          data: {
            userId: Number((session.user as any)?.id ?? 1) || 1,
            lotNo: String(rec.lotNo),
            action: InventoryAction.ISSUE,
            targetWarehouseId: Number(warehouseId),
            quantity: -Math.abs(Number(quantity)), // ตัดตามโดส
            transactionDate: now,
            remarks: 'Issue (single-dose)',
          },
        })

        return rec
      }

      /* ===== กรณีวัคซีนหลายโดสต่อขวด (เช่น 1:10) ===== */
      let chosenLotNo = lotNo as string | null

      // 1) ถ้าไม่บังคับล็อต → หา open vial ที่ยังไม่หมดเวลาและเหลือโดสพอ (เรียงใกล้หมดเวลาก่อน)
      if (!chosenLotNo) {
        const lots = await tx.vaccineLot.findMany({
          where: { vaccineId: Number(vaccineId) },
          select: { lotNo: true },
        })
        const lotNos = lots.map(l => l.lotNo)

        const openVials = await tx.openVial.findMany({
          where: {
            warehouseId: Number(warehouseId),
            lotNo: { in: lotNos },
            expiresAt: { gt: now },
          },
          orderBy: { expiresAt: 'asc' },
        })

        const candidate = openVials.find(o => (o.dosesTotal - o.dosesUsed) >= Number(quantity))
        if (candidate) {
          chosenLotNo = candidate.lotNo
          const usedAfter = candidate.dosesUsed + Number(quantity)
          if (usedAfter >= candidate.dosesTotal) {
            await tx.openVial.delete({
              where: { warehouseId_lotNo: { warehouseId: candidate.warehouseId, lotNo: candidate.lotNo } },
            })
          } else {
            await tx.openVial.update({
              where: { warehouseId_lotNo: { warehouseId: candidate.warehouseId, lotNo: candidate.lotNo } },
              data: { dosesUsed: { increment: Number(quantity) } },
            })
          }
        }
      }

      // 2) ถ้าไม่เจอ/ไม่มี → เปิดขวดใหม่ด้วย FEFO แล้ว "ตัดคลัง -1 ขวด" ณ จุดเปิดขวด
      if (!chosenLotNo) {
        const lot = await pickLotFEFO(Number(vaccineId), Number(warehouseId), 1) // ต้องมีอย่างน้อย 1 ขวด
        if (!lot) throw new Error('สต็อกไม่พอหรือไม่มีล็อตที่ใช้งานได้ในคลังนี้')
        const onHand = await getOnHandForWarehouseLot(Number(warehouseId), lot)
        if (onHand < 1) throw new Error(`ล็อต ${lot} คงเหลือไม่พอสำหรับเปิดขวด`)

        chosenLotNo = lot
        const openedAt = now
        const expiresAt = new Date(openedAt.getTime() + 8 * 60 * 60 * 1000)

        // ISSUE -1 ขวด (เปิดขวด)
        await tx.vaccineInventory.create({
          data: {
            userId: Number((session.user as any)?.id ?? 1) || 1,
            lotNo: lot,
            action: InventoryAction.ISSUE,
            targetWarehouseId: Number(warehouseId),
            quantity: -1,
            transactionDate: openedAt,
            remarks: 'Open vial (auto)',
          },
        })

        // สร้าง/รีเซ็ต open vial ใส่โดสที่ใช้ในครั้งนี้
        const used = Math.min(Number(quantity), DPER)
        await tx.openVial.upsert({
          where: { warehouseId_lotNo: { warehouseId: Number(warehouseId), lotNo: lot } },
          update: { dosesTotal: DPER, dosesUsed: used, openedAt, expiresAt },
          create: { warehouseId: Number(warehouseId), lotNo: lot, dosesTotal: DPER, dosesUsed: used, openedAt, expiresAt },
        })
        if (used >= DPER) {
          await tx.openVial.delete({
            where: { warehouseId_lotNo: { warehouseId: Number(warehouseId), lotNo: lot } },
          })
        }
      } else {
        // ผู้ใช้บังคับล็อตเอง → ตรวจความถูกต้อง (ไม่ตัดสต็อกเพิ่ม ณ จุดนี้)
        const lot = await tx.vaccineLot.findUnique({ where: { lotNo: String(chosenLotNo) } })
        if (!lot || lot.vaccineId !== Number(vaccineId)) {
          throw new Error('ไม่พบล็อตนี้ หรือไม่ตรงกับวัคซีนที่เลือก')
        }
      }

      // 3) บันทึกประวัติการฉีด (multi-dose ไม่ ISSUE เพิ่มอีก; เราตัด -1 ตอนเปิดขวดแล้ว)
      const rec = await tx.vaccinationRecord.create({
        data: {
          patientId: Number(patientId),
          vaccineId: Number(vaccineId),
          lotNo: String(chosenLotNo),
          vaccinationDate: new Date(vaccinationDate),
          doseNumber: doseNumber ? Number(doseNumber) : null,
          injectionSite: injectionSite ?? null,
          status:
            status && Object.values(VaccinationStatus).includes(status)
              ? status
              : VaccinationStatus.COMPLETED,
          provider: provider ?? null,
          remarks: remarks ?? null,
        },
      })

      return rec
    })

    return NextResponse.json(created, { status: 201 })
  } catch (err: any) {
    console.error('❌ VaccinationRecord POST (open-vial aware) error:', err)
    return NextResponse.json({ message: err?.message || 'Internal server error' }, { status: 500 })
  }
}
