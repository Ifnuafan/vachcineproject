// app/api/open-vials/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { VaccinationStatus, InventoryAction } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/* ======================== Helpers ======================== */
async function getOnHandForWarehouseLot(warehouseId: number, lotNo: string) {
  const rows = await prisma.vaccineInventory.findMany({
    where: { lotNo, OR: [{ targetWarehouseId: warehouseId }, { sourceWarehouseId: warehouseId }] },
    select: { action: true, quantity: true, sourceWarehouseId: true, targetWarehouseId: true },
  })
  let sum = 0
  for (const r of rows) {
    const qty = Math.abs(r.quantity)
    switch (r.action) {
      case 'RECEIVE':
        if (r.targetWarehouseId === warehouseId) sum += qty
        break
      case 'ISSUE':
        if (r.targetWarehouseId === warehouseId) sum -= qty
        break
      case 'DISPOSE':
        if (r.targetWarehouseId === warehouseId) sum -= qty
        break
      case 'TRANSFER':
        if (r.sourceWarehouseId === warehouseId) sum -= qty
        if (r.targetWarehouseId === warehouseId) sum += qty
        break
    }
  }
  return sum
}

async function pickLotFEFO(vaccineId: number, warehouseId: number, needQty = 1) {
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

// รองรับ “1:10”, “1/10”, “x10”, “10”, อื่น ๆ ดีฟอลต์ 1
function dosesPerVialFromUsage(usageType?: string | null): number {
  const s = (usageType || '').toLowerCase().trim()
  const m1 = s.match(/1\s*[:/]\s*(\d+)/); if (m1) return Math.max(1, Number(m1[1]) || 1)
  const m2 = s.match(/[xv](\d+)$/i);     if (m2) return Math.max(1, Number(m2[1]) || 1)
  const m3 = s.match(/(\d+)/);           if (m3) return Math.max(1, Number(m3[1]) || 1)
  return 1
}

/* ======================== GET: list open vials ======================== */
// GET /api/open-vials?warehouseId=1&vaccineId=2&status=OPEN|EXPIRED|ALL&limit=500
export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams
    const warehouseId = Number(sp.get('warehouseId') || '')
    const vaccineId = sp.get('vaccineId') ? Number(sp.get('vaccineId')) : undefined
    const status = (sp.get('status') || 'OPEN') as 'OPEN' | 'EXPIRED' | 'ALL'
    const limit = Math.min(1000, Number(sp.get('limit') || 500))

    if (!Number.isFinite(warehouseId)) {
      return NextResponse.json({ message: 'warehouseId is required' }, { status: 400 })
    }

    const now = new Date()
    const where: any = {
      warehouseId,
      ...(status === 'OPEN'
        ? { expiresAt: { gt: now } }
        : status === 'EXPIRED'
        ? { expiresAt: { lte: now } }
        : {}),
      ...(vaccineId ? { lot: { is: { vaccineId: Number(vaccineId) } } } : {}),
    }

    const rows = await prisma.openVial.findMany({
      where,
      orderBy: [{ expiresAt: 'asc' }],
      take: limit,
      include: {
        lot: { select: { vaccineId: true, vaccine: { select: { id: true, name: true } } } },
      },
    })

    // ⚠️ กัน null/invalid date → ไม่ให้ throw แล้วกลายเป็น HTML error
    const items = rows.map((r) => {
      const openedAtISO  = r.openedAt ? new Date(r.openedAt).toISOString() : ''
      const expiresAtISO = r.expiresAt ? new Date(r.expiresAt).toISOString() : ''
      const isOpen = r.expiresAt ? r.expiresAt.getTime() > now.getTime() : false
      return {
        id: `${r.warehouseId}:${r.lotNo}`, // composite key → string id
        warehouseId: r.warehouseId,
        vaccineId: r.lot?.vaccineId ?? null,
        lotNo: r.lotNo,
        dosesTotal: r.dosesTotal,
        dosesUsed: r.dosesUsed,
        openedAt: openedAtISO,
        expiresAt: expiresAtISO,
        status: isOpen ? ('OPEN' as const) : ('EXPIRED' as const),
        vaccine: r.lot?.vaccine ?? null,
      }
    })

    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('open-vials GET error', e)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

/* ======================== POST: create + prefer OPEN vials ======================== */
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
      lotNo: forcedLotNo,
    } = body ?? {}

    if (!patientId || !vaccineId || !warehouseId || !vaccinationDate) {
      return NextResponse.json(
        { message: 'กรอกข้อมูลไม่ครบ (patientId, vaccineId, warehouseId, vaccinationDate)' },
        { status: 400 },
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
    if (!p) return NextResponse.json({ message: 'ไม่พบ Patient' }, { status: 404 })
    if (!v) return NextResponse.json({ message: 'ไม่พบ Vaccine' }, { status: 404 })
    if (!wh) return NextResponse.json({ message: 'ไม่พบ Warehouse' }, { status: 404 })

    const perVial = dosesPerVialFromUsage(v.usageType)
    const userId = Number((session.user as any)?.id) || 1

    // 1) พยายามใช้ขวดเปิดค้างก่อน
    let chosenLotNo: string | null = forcedLotNo ?? null
    const now = new Date()

    if (!chosenLotNo) {
      const openVials = await prisma.openVial.findMany({
        where: { warehouseId: Number(warehouseId), expiresAt: { gt: now } },
        orderBy: { expiresAt: 'asc' },
      })

      const lotNos = Array.from(new Set(openVials.map((o) => o.lotNo)))
      const lots = await prisma.vaccineLot.findMany({
        where: { lotNo: { in: lotNos } },
        select: { lotNo: true, vaccineId: true },
      })
      const lotVaccine = new Map(lots.map((l) => [l.lotNo, l.vaccineId]))

      const candidate = openVials.find((o) => {
        const vid = lotVaccine.get(o.lotNo)
        const remain = o.dosesTotal - o.dosesUsed
        return vid === Number(vaccineId) && remain > 0
      })

      if (candidate) chosenLotNo = candidate.lotNo
    }

    // 2) ถ้าไม่เจอ → FEFO แล้ว “เปิดขวดใหม่”
    let justOpenedThisCall = false
    if (!chosenLotNo) {
      const fefoLot = await pickLotFEFO(Number(vaccineId), Number(warehouseId), 1)
      if (!fefoLot) {
        return NextResponse.json({ message: 'สต็อกไม่พอหรือไม่มีล็อตที่ใช้งานได้ในคลังนี้' }, { status: 409 })
      }
      chosenLotNo = fefoLot

      const openedAt = now
      const expiresAt = new Date(openedAt.getTime() + 8 * 60 * 60 * 1000) // +8 ชั่วโมง

      await prisma.openVial.upsert({
        where: { warehouseId_lotNo: { warehouseId: Number(warehouseId), lotNo: fefoLot } },
        update: { openedAt, expiresAt, dosesTotal: perVial, dosesUsed: 0 },
        create: { warehouseId: Number(warehouseId), lotNo: fefoLot, openedAt, expiresAt, dosesTotal: perVial, dosesUsed: 0 },
      })
      justOpenedThisCall = true
    } else {
      // ตรวจสอบความถูกต้องของ lot และปริมาณคงเหลือ
      const lot = await prisma.vaccineLot.findUnique({ where: { lotNo: String(chosenLotNo) } })
      if (!lot || lot.vaccineId !== Number(vaccineId)) {
        return NextResponse.json({ message: 'ไม่พบล็อตนี้ หรือไม่ตรงกับวัคซีนที่เลือก' }, { status: 404 })
      }
      const onHand = await getOnHandForWarehouseLot(Number(warehouseId), String(chosenLotNo))
      if (onHand < Number(quantity)) {
        return NextResponse.json({ message: `ล็อต ${chosenLotNo} คงเหลือไม่พอ` }, { status: 409 })
      }
    }

    // 3) Transaction: บันทึกเข็ม + อัปเดต open_vial + หักสต็อก
    const created = await prisma.$transaction(async (tx) => {
      const record = await tx.vaccinationRecord.create({
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

      // อัปเดตการใช้โดสของ open vial (กันเคสหาไม่เจอ + race)
      const doseUse = Math.abs(Number(quantity))
      const key = { warehouseId_lotNo: { warehouseId: Number(warehouseId), lotNo: String(chosenLotNo) } }
      const current = await tx.openVial.findUnique({ where: key })

      if (current) {
        const newUsed = current.dosesUsed + doseUse
        if (newUsed >= current.dosesTotal) {
          await tx.openVial.delete({ where: key })
        } else {
          await tx.openVial.update({ where: key, data: { dosesUsed: newUsed } })
        }
      } else if (justOpenedThisCall) {
        const openedAt = new Date()
        const expiresAt = new Date(openedAt.getTime() + 8 * 60 * 60 * 1000)
        await tx.openVial.upsert({
          where: key,
          update: { dosesUsed: Math.min(doseUse, perVial) },
          create: {
            warehouseId: Number(warehouseId),
            lotNo: String(chosenLotNo),
            openedAt,
            expiresAt,
            dosesTotal: perVial,
            dosesUsed: Math.min(doseUse, perVial),
          },
        })
      }

      await tx.vaccineInventory.create({
        data: {
          userId,
          lotNo: String(chosenLotNo),
        action: InventoryAction.ISSUE,
          targetWarehouseId: Number(warehouseId),
          quantity: -doseUse,
          transactionDate: new Date(),
          remarks: 'Auto issue from vaccination',
        },
      })

      return record
    })

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    console.error('❌ VaccinationRecord POST error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
