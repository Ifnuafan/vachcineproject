// app/api/inventory/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { InventoryAction } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/inventory?warehouseId=1
 * คืนค่า Array ของ:
 * {
 *   warehouseId: number
 *   lotNo: string
 *   quantity: number
 *   vaccineId: number | null
 *   vaccineName: string | null
 *   expirationDate: string | null (ISO)
 * }
 *
 * หมายเหตุสำคัญ:
 * - ใช้ "affectedWarehouseId" แทนการบวกทั้ง source/target พร้อมกัน
 * - TRANSFER จะมี 2 แถว (ลบที่ต้นทาง, บวกที่ปลายทาง) → เราจะนับให้คลังที่ถูกกระทบ “ต่อแถว”
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const warehouseIdParam = searchParams.get('warehouseId')
    const filterWarehouseId = warehouseIdParam ? Number(warehouseIdParam) : undefined

    const where = filterWarehouseId
      ? {
          OR: [
            { sourceWarehouseId: filterWarehouseId },
            { targetWarehouseId: filterWarehouseId },
          ],
        }
      : undefined

    const movements = await prisma.vaccineInventory.findMany({
      where,
      select: {
        action: true,
        quantity: true,
        sourceWarehouseId: true,
        targetWarehouseId: true,
        lotNo: true,
        lot: {
          select: {
            vaccineId: true,
            expirationDate: true,
            vaccine: { select: { name: true } },
          },
        },
      },
      orderBy: { transactionDate: 'asc' }, // เรียงเวลาเพื่อความเข้าใจ (ไม่กระทบผลรวม)
    })

    type Row = {
      warehouseId: number
      lotNo: string
      vaccineId: number | null
      vaccineName: string | null
      expirationDate: string | null
      quantity: number
    }

    const stock = new Map<string, Row>()

    for (const m of movements) {
      // คลังที่ "ถูกกระทบ" ต่อแถว
      const affectedWarehouseId =
        m.action === InventoryAction.TRANSFER && m.quantity < 0
          ? m.sourceWarehouseId
          : m.targetWarehouseId

      if (!affectedWarehouseId) continue
      if (filterWarehouseId && affectedWarehouseId !== filterWarehouseId) continue

      const key = `${affectedWarehouseId}:${m.lotNo}`
      const curr =
        stock.get(key) ??
        ({
          warehouseId: affectedWarehouseId,
          lotNo: m.lotNo,
          vaccineId: m.lot?.vaccineId ?? null,
          vaccineName: m.lot?.vaccine?.name ?? null,
          expirationDate: m.lot?.expirationDate
            ? m.lot.expirationDate.toISOString()
            : null,
          quantity: 0,
        } as Row)

      curr.quantity += m.quantity
      stock.set(key, curr)
    }

    // กรองแถวที่คงเหลือ 0 ออก (ถ้าอยากแสดง 0 ก็ลบบรรทัดนี้)
    const result = [...stock.values()].filter((r) => r.quantity !== 0)

    // เรียงให้อ่านง่าย: ใกล้หมดอายุขึ้นก่อน, ตามด้วยชื่อวัคซีน, lotNo
    result.sort((a, b) => {
      const ad = a.expirationDate ? new Date(a.expirationDate).getTime() : Infinity
      const bd = b.expirationDate ? new Date(b.expirationDate).getTime() : Infinity
      if (ad !== bd) return ad - bd
      const an = (a.vaccineName ?? '').localeCompare(b.vaccineName ?? '')
      if (an !== 0) return an
      return a.lotNo.localeCompare(b.lotNo)
    })

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('❌ Inventory GET error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
