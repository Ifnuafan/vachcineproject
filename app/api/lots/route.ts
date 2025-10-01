// app/api/lots/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type LotStatus = 'USABLE' | 'NEAR_EXPIRE' | 'EXPIRED'
const NEAR_EXPIRE_DAYS = 60

const noStore = { headers: { 'Cache-Control': 'no-store' } }

function required(v?: string | number | null) {
  return v !== undefined && v !== null && String(v).trim() !== ''
}

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
  if (diffDays <= NEAR_EXPIRE_DAYS) return 'NEAR_EXPIRE'
  return 'USABLE'
}

// GET /api/lots?search=&status=&vaccineId=&from=&to=&page=1&limit=20&onlyUsable=1&fefo=1
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams
  const rawSearch = q.get('search') ?? ''
  const search = rawSearch.trim()
  const status = (q.get('status') ?? '') as LotStatus | ''
  const vaccineId = q.get('vaccineId')
  const from = q.get('from') // YYYY-MM-DD
  const to = q.get('to')     // YYYY-MM-DD
  const onlyUsable = q.get('onlyUsable') === '1'
  const fefo = q.get('fefo') === '1'

  const page = Math.max(1, Number.parseInt(q.get('page') ?? '1') || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(q.get('limit') ?? '20') || 20))
  const skip = (page - 1) * limit

  const where: any = {
    AND: [
      search
        ? {
            OR: [
              { lotNo: { contains: search } },
              { batchNumber: { contains: search } },
              { serialNumber: { contains: search } },
              { vaccine: { is: { name: { contains: search } } } },
              { vaccine: { is: { type: { contains: search } } } },
            ],
          }
        : {},
      status ? { status } : {},
      vaccineId ? { vaccineId: Number(vaccineId) } : {},
      from ? { expirationDate: { gte: parseDateOnly(from) } } : {},
      to ? { expirationDate: { lte: parseDateOnly(to) } } : {},
      onlyUsable ? { status: 'USABLE' } : {},
    ],
  }

  // เรียงลำดับ: ถ้า fefo=1 → เรียงหมดอายุใกล้ก่อน, ไม่งั้นใช้ default เดิมที่คุณตั้งไว้
  const orderBy = fefo
    ? [{ expirationDate: 'asc' as const }, { createdAt: 'desc' as const }, { updatedAt: 'desc' as const }]
    : [{ createdAt: 'desc' as const }, { expirationDate: 'asc' as const }, { updatedAt: 'desc' as const }]

  const [items, total] = await Promise.all([
    prisma.vaccineLot.findMany({
      where,
      include: {
        vaccine: { select: { id: true, name: true, type: true, requiredDoses: true, usageType: true } },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.vaccineLot.count({ where }),
  ])

  return NextResponse.json({ items, total, page, limit }, noStore)
}

// POST /api/lots
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  if (role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403, ...noStore })
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: 'invalid json' }, { status: 400, ...noStore })
  }

  const { lotNo, vaccineId, expirationDate, batchNumber, serialNumber } = body ?? {}

  if (!required(lotNo) || !required(vaccineId) || !required(expirationDate)) {
    return NextResponse.json(
      { message: 'กรอกข้อมูลไม่ครบ (lotNo, vaccineId, expirationDate)' },
      { status: 400, ...noStore }
    )
  }

  const dup = await prisma.vaccineLot.findUnique({ where: { lotNo: String(lotNo) } })
  if (dup) {
    return NextResponse.json({ message: 'มีรหัสล็อตนี้อยู่แล้ว' }, { status: 409, ...noStore })
  }

  const v = await prisma.vaccine.findUnique({ where: { id: Number(vaccineId) } })
  if (!v) {
    return NextResponse.json({ message: 'ไม่พบ Vaccine ตามที่ระบุ' }, { status: 404, ...noStore })
  }

  const expDate = parseDateOnly(String(expirationDate))
  if (isNaN(expDate.getTime())) {
    return NextResponse.json({ message: 'รูปแบบวันหมดอายุไม่ถูกต้อง (YYYY-MM-DD)' }, { status: 400, ...noStore })
  }

  const status = calcStatus(expDate)

  const created = await prisma.vaccineLot.create({
    data: {
      lotNo: String(lotNo),
      vaccineId: Number(vaccineId),
      expirationDate: expDate,
      batchNumber: batchNumber ? String(batchNumber) : null,
      serialNumber: serialNumber ? String(serialNumber) : null,
      status,
    },
    include: { vaccine: true },
  })

  return NextResponse.json(created, { status: 201, ...noStore })
}
