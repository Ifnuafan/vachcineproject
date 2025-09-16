// app/api/vaccination-records/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import {
  VaccinationStatus,
  InventoryAction,       // ← ใช้ enum ตาม schema
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
        patient: { select: { id: true, fullName: true, cid: true } },
        vaccine: { select: { id: true, name: true, type: true } },
        lot:     { select: { lotNo: true, expirationDate: true, status: true } },
      },
    }),
    prisma.vaccinationRecord.count({ where }),
  ])

  return NextResponse.json({ items, total, page, limit }, { headers: { 'Cache-Control': 'no-store' } })
}

/* ------------------ helpers: stock per warehouse ------------------ */
/**
 * คำนวณ on-hand ต่อคลัง-ต่อล็อต จากตาราง VaccineInventory
 * รองรับทุก action โดยตีความทิศทางเอง (ไม่พึ่งค่า sign ใน DB)
 */
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
    const qty = Math.abs(r.quantity) // กันกรณีมีการบันทึกเป็นลบ/บวกปนกัน
    switch (r.action) {
      case InventoryAction.RECEIVE: {
        if (r.targetWarehouseId === warehouseId) sum += qty
        break
      }
      case InventoryAction.ISSUE: {
        if (r.targetWarehouseId === warehouseId) sum -= qty
        break
      }
      case InventoryAction.DISPOSE: {
        if (r.targetWarehouseId === warehouseId) sum -= qty
        break
      }
      case InventoryAction.TRANSFER: {
        if (r.sourceWarehouseId === warehouseId) sum -= qty
        if (r.targetWarehouseId === warehouseId) sum += qty
        break
      }
    }
  }
  return sum
}

/**
 * เลือกล็อตแบบ FEFO (หมดอายุเร็วสุด) ที่มีจำนวนเพียงพอในคลังนั้น ๆ
 */
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

/* ------------------ POST: create + auto pick lot + issue ------------------ */
// POST /api/vaccination-records
// body: { patientId, vaccineId, warehouseId, quantity?, vaccinationDate, doseNumber?, injectionSite?, status?, provider?, remarks?, lotNo? }
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      patientId,
      vaccineId,
      warehouseId,     // ← ต้องมี เพื่อรู้จะหักสต็อกจากคลังไหน
      vaccinationDate,
      quantity = 1,
      doseNumber,
      injectionSite,
      status,
      provider,
      remarks,
      lotNo,           // ← ส่งมาก็ได้ ถ้าไม่ส่งจะให้ระบบเลือกให้
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

    // FK checks (patient / vaccine / warehouse)
    const [p, v, wh] = await Promise.all([
      prisma.patient.findUnique({ where: { id: Number(patientId) } }),
      prisma.vaccine.findUnique({ where: { id: Number(vaccineId) } }),
      prisma.warehouse.findUnique({ where: { id: Number(warehouseId) } }),
    ])
    if (!p)  return NextResponse.json({ message: 'ไม่พบ Patient' }, { status: 404 })
    if (!v)  return NextResponse.json({ message: 'ไม่พบ Vaccine' }, { status: 404 })
    if (!wh) return NextResponse.json({ message: 'ไม่พบ Warehouse' }, { status: 404 })

    // เลือกล็อต: ถ้าไม่ได้ส่ง lotNo → FEFO
    let chosenLotNo: string | null = lotNo ?? null
    if (!chosenLotNo) {
      chosenLotNo = await pickLotFEFO(Number(vaccineId), Number(warehouseId), Number(quantity))
      if (!chosenLotNo) {
        return NextResponse.json({ message: 'สต็อกไม่พอหรือไม่มีล็อตที่ใช้งานได้ในคลังนี้' }, { status: 409 })
      }
    } else {
      // ถ้าส่ง lot มาเอง → ตรวจว่ามีอยู่จริง + stock พอ
      const lot = await prisma.vaccineLot.findUnique({ where: { lotNo: String(chosenLotNo) } })
      if (!lot || lot.vaccineId !== Number(vaccineId)) {
        return NextResponse.json({ message: 'ไม่พบล็อตนี้ หรือไม่ตรงกับวัคซีนที่เลือก' }, { status: 404 })
      }
      const onHand = await getOnHandForWarehouseLot(Number(warehouseId), String(chosenLotNo))
      if (onHand < Number(quantity)) {
        return NextResponse.json({ message: `ล็อต ${chosenLotNo} คงเหลือไม่พอ` }, { status: 409 })
      }
    }

    const record = await prisma.$transaction(async (tx) => {
      // 1) บันทึกประวัติการฉีด
      const created = await tx.vaccinationRecord.create({
        data: {
          patientId: Number(patientId),
          vaccineId: Number(vaccineId),
          lotNo: String(chosenLotNo),
          vaccinationDate: new Date(vaccinationDate),
          doseNumber: doseNumber ? Number(doseNumber) : null,
          injectionSite: injectionSite ?? null,
          status: status && Object.values(VaccinationStatus).includes(status)
            ? status
            : VaccinationStatus.COMPLETED,
          provider: provider ?? null,
          remarks: remarks ?? null,
        },
      })

      // 2) หักสต็อกจากคลัง (ISSUE)
      await tx.vaccineInventory.create({
        data: {
          userId: Number((session.user as any)?.id ?? 0) || 1, // ป้องกัน null — ปรับตามระบบ auth ของคุณ
          lotNo: String(chosenLotNo),
          action: InventoryAction.ISSUE,
          // โครงสร้างที่โปรเจกต์นี้ใช้: action อื่น ๆ ก็อ้างคลังผ่าน targetWarehouseId เช่นกัน
          targetWarehouseId: Number(warehouseId),
          // บันทึกเป็นค่าลบให้ชัดเจน
          quantity: -Math.abs(Number(quantity)),
          transactionDate: new Date(),
          remarks: 'Auto issue from vaccination',
        },
      })

      return created
    })

    return NextResponse.json(record, { status: 201 })
  } catch (err) {
    console.error('❌ VaccinationRecord POST error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
