// app/api/lots/[lotNo]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

type LotStatus = 'USABLE' | 'NEAR_EXPIRE' | 'EXPIRED'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function parseDateOnly(isoDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate))
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return new Date(isoDate)
}
function calcStatus(expirationDate: Date): LotStatus {
  const today = new Date()
  const d0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const d1 = new Date(expirationDate.getFullYear(), expirationDate.getMonth(), expirationDate.getDate())
  const diffDays = Math.ceil((d1.getTime() - d0.getTime()) / 86400000)
  if (diffDays <= 0) return 'EXPIRED'
  if (diffDays <= 14) return 'NEAR_EXPIRE'
  return 'USABLE'
}

// GET /api/lots/[lotNo]
export async function GET(_req: Request, ctx: { params: Promise<{ lotNo: string }> }) {
  const { lotNo: raw } = await ctx.params
  const lotNo = decodeURIComponent(raw)

  const item = await prisma.vaccineLot.findUnique({
    where: { lotNo },
    include: { vaccine: true },
  })
  if (!item) return NextResponse.json({ message: 'ไม่พบล็อต' }, { status: 404 })
  return NextResponse.json(item, { headers: { 'Cache-Control': 'no-store' } })
}

// PUT /api/lots/[lotNo]
export async function PUT(req: Request, ctx: { params: Promise<{ lotNo: string }> }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { lotNo: raw } = await ctx.params
  const lotNo = decodeURIComponent(raw)

  const body = await req.json().catch(() => ({}))
  const { vaccineId, expirationDate, batchNumber, serialNumber } = body ?? {}

  const existing = await prisma.vaccineLot.findUnique({ where: { lotNo } })
  if (!existing) return NextResponse.json({ message: 'ไม่พบล็อต' }, { status: 404 })

  let expDate: Date | undefined
  if (expirationDate) {
    expDate = parseDateOnly(String(expirationDate))
    if (isNaN(expDate.getTime())) {
      return NextResponse.json({ message: 'รูปแบบวันหมดอายุไม่ถูกต้อง' }, { status: 400 })
    }
  }

  if (vaccineId) {
    const v = await prisma.vaccine.findUnique({ where: { id: Number(vaccineId) } })
    if (!v) return NextResponse.json({ message: 'ไม่พบ Vaccine ตามที่ระบุ' }, { status: 404 })
  }

  const updated = await prisma.vaccineLot.update({
    where: { lotNo },
    data: {
      vaccineId: vaccineId ? Number(vaccineId) : undefined,
      expirationDate: expDate ?? undefined,
      batchNumber: batchNumber === undefined ? undefined : (batchNumber || null),
      serialNumber: serialNumber === undefined ? undefined : (serialNumber || null),
      status: expDate ? calcStatus(expDate) : undefined,
    },
    include: { vaccine: true },
  })

  return NextResponse.json(updated, { headers: { 'Cache-Control': 'no-store' } })
}

// DELETE /api/lots/[lotNo]
export async function DELETE(_req: Request, ctx: { params: Promise<{ lotNo: string }> }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { lotNo: raw } = await ctx.params
  const lotNo = decodeURIComponent(raw)

  try {
    await prisma.vaccineLot.delete({ where: { lotNo } })
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ message: 'ลบไม่สำเร็จ' }, { status: 400 })
  }
}
