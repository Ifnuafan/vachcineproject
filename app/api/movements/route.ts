// app/api/movements/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { InventoryAction, LotStatus, Prisma } from '@prisma/client'  // <- เพิ่ม Prisma เพื่อจับ error code

function parseDateOnlyOrISO(input?: string): Date {
  if (!input) return new Date()
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(input))
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return new Date(input)
}

const toInt = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  // ✅ แปลง id จาก session ให้เป็น number เสมอ; ถ้าไม่ได้ค่อย fallback หาโดยอีเมล
  let userId = toInt((session.user as any)?.id)
  if (!userId && session.user?.email) {
    const u = await prisma.user.findUnique({ where: { email: session.user.email } })
    userId = toInt(u?.id)
  }
  if (!userId) {
    return NextResponse.json(
      { message: 'Invalid session user (ไม่พบ id ผู้ใช้ใน session และหาโดยอีเมลไม่เจอ)' },
      { status: 400 },
    )
  }

  try {
    const body = (await req.json()) as {
      action: InventoryAction | string
      lotNo: string
      quantity: number | string
      sourceWarehouseId?: number | string
      targetWarehouseId?: number | string
      remarks?: string
      transactionDate?: string
      vaccineId?: number | string
      expirationDate?: string
      batchNumber?: string
      serialNumber?: string
    }

    const action = body?.action as InventoryAction
    const lotNo = String(body?.lotNo ?? '').trim()
    const quantity = toInt(body?.quantity)

    if (!action || !lotNo || !Number.isFinite(quantity!)) {
      return NextResponse.json(
        { message: 'Missing required fields: action, lotNo, quantity' },
        { status: 400 },
      )
    }
    if (!Object.values(InventoryAction).includes(action)) {
      return NextResponse.json({ message: `Invalid action: ${action}` }, { status: 400 })
    }
    if ((quantity as number) <= 0) {
      return NextResponse.json({ message: 'quantity must be > 0' }, { status: 400 })
    }

    const trxDate = parseDateOnlyOrISO(body.transactionDate)
    if (isNaN(trxDate.getTime())) {
      return NextResponse.json({ message: 'Invalid transactionDate' }, { status: 400 })
    }

    // ----- ตรวจ/สร้างล็อตก่อน -----
    let lot = await prisma.vaccineLot.findUnique({ where: { lotNo } })
    if (!lot) {
      if (action === 'RECEIVE') {
        const vaccineId = toInt(body.vaccineId)
        const expirationDate = body.expirationDate
        if (!vaccineId || !expirationDate) {
          return NextResponse.json(
            { message: 'ล็อตยังไม่มีในระบบ: ต้องใส่ vaccineId และ expirationDate เพื่อสร้างล็อต' },
            { status: 400 },
          )
        }
        const v = await prisma.vaccine.findUnique({ where: { id: vaccineId } })
        if (!v) return NextResponse.json({ message: 'ไม่พบ Vaccine ตามที่ระบุ' }, { status: 404 })

        const exp = parseDateOnlyOrISO(expirationDate)
        if (isNaN(exp.getTime())) {
          return NextResponse.json({ message: 'Invalid expirationDate' }, { status: 400 })
        }

        lot = await prisma.vaccineLot.create({
          data: {
            lotNo,
            vaccineId,
            expirationDate: exp,
            status: LotStatus.USABLE,
            batchNumber: body.batchNumber ?? null,
            serialNumber: body.serialNumber ?? null,
          },
        })
      } else {
        return NextResponse.json(
          { message: 'ไม่พบล็อตนี้ในระบบ (ให้สร้างด้วย RECEIVE ก่อน หรือส่ง vaccineId + expirationDate)' },
          { status: 400 },
        )
      }
    }

    const sourceWarehouseId = toInt(body.sourceWarehouseId)
    const targetWarehouseId = toInt(body.targetWarehouseId)

    if (action === 'TRANSFER') {
      if (!sourceWarehouseId || !targetWarehouseId) {
        return NextResponse.json(
          { message: 'ต้องระบุ sourceWarehouseId และ targetWarehouseId สำหรับ TRANSFER' },
          { status: 400 },
        )
      }
      if (sourceWarehouseId === targetWarehouseId) {
        return NextResponse.json({ message: 'Source และ Target ต้องต่างกัน' }, { status: 400 })
      }

      const [srcW, dstW] = await Promise.all([
        prisma.warehouse.findUnique({ where: { id: sourceWarehouseId } }),
        prisma.warehouse.findUnique({ where: { id: targetWarehouseId } }),
      ])
      if (!srcW) return NextResponse.json({ message: 'ไม่พบคลังต้นทาง' }, { status: 404 })
      if (!dstW) return NextResponse.json({ message: 'ไม่พบคลังปลายทาง' }, { status: 404 })

      // ทำเป็น 2 แถว
      const result = await prisma.$transaction(async (tx) => {
        await tx.vaccineInventory.create({
          data: {
            action: InventoryAction.TRANSFER,
            lotNo,
            quantity: -Math.abs(quantity!),
            userId,                      // <- เป็น number แน่ ๆ แล้ว
            sourceWarehouseId,
            targetWarehouseId,
            remarks: body.remarks ?? null,
            transactionDate: trxDate,
          },
        })
        const created = await tx.vaccineInventory.create({
          data: {
            action: InventoryAction.TRANSFER,
            lotNo,
            quantity: Math.abs(quantity!),
            userId,                      // <- เป็น number แน่ ๆ แล้ว
            sourceWarehouseId,
            targetWarehouseId,
            remarks: body.remarks ?? null,
            transactionDate: trxDate,
          },
        })
        return created
      })

      return NextResponse.json(result, { status: 201 })
    }

    // RECEIVE / ISSUE / DISPOSE → ต้องมี targetWarehouseId
    if (!targetWarehouseId) {
      return NextResponse.json({ message: 'ต้องระบุ targetWarehouseId' }, { status: 400 })
    }
    const dst = await prisma.warehouse.findUnique({ where: { id: targetWarehouseId } })
    if (!dst) return NextResponse.json({ message: 'ไม่พบคลังปลายทาง' }, { status: 404 })

    const signedQty =
      action === 'ISSUE' || action === 'DISPOSE' ? -Math.abs(quantity!) : Math.abs(quantity!)

    const created = await prisma.vaccineInventory.create({
      data: {
        action,
        lotNo,
        quantity: signedQty,
        userId,                          // <- number
        sourceWarehouseId: sourceWarehouseId ?? null,
        targetWarehouseId,
        remarks: body.remarks ?? null,
        transactionDate: trxDate,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (err: any) {
    // Log ให้เห็น code ของ Prisma ชัด ๆ
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('❌ PrismaKnownError', err.code, err.message, err.meta)
      if (err.code === 'P2003') {
        return NextResponse.json(
          { message: 'Foreign key failed (ตรวจสอบ userId/sourceWarehouseId/targetWarehouseId/lotNo)' },
          { status: 400 },
        )
      }
      if (err.code === 'P2002') {
        return NextResponse.json({ message: 'Unique constraint failed' }, { status: 409 })
      }
    } else if (err instanceof Prisma.PrismaClientValidationError) {
      console.error('❌ PrismaValidationError', err.message)
      return NextResponse.json({ message: 'Validation error (เช็คชนิดข้อมูล payload)' }, { status: 400 })
    } else {
      console.error('❌ Movement error:', err)
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
