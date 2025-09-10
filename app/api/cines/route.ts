// app/api/cine/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// validate ง่าย ๆ
function required(v?: string | number | null) {
  return v !== undefined && v !== null && String(v).trim() !== ''
}

// GET /api/cine?search=&type=&page=1&limit=20
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const search = params.get('search') ?? ''
  const type = params.get('type') ?? ''
  const p = Math.max(1, parseInt(params.get('page') ?? '1'))
  const l = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '20')))

  const where: any = {
    AND: [
      search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { type: { contains: search, mode: 'insensitive' } },
              { usageType: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      type ? { type: { equals: type } } : {},
    ],
  }

  const [items, total] = await Promise.all([
    prisma.vaccine.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      skip: (p - 1) * l,
      take: l,
      select: {
        id: true,
        name: true,
        type: true,
        requiredDoses: true,
        usageType: true,
        updatedAt: true,
        _count: { select: { lots: true } }, // จำนวนล็อตต่อวัคซีน
      },
    }),
    prisma.vaccine.count({ where }),
  ])

  return NextResponse.json({ items, total, page: p, limit: l })
}

// POST /api/cine
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  if (role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { name, type, requiredDoses, usageType } = body ?? {}

  if (!required(name) || !required(type) || !required(requiredDoses) || !required(usageType)) {
    return NextResponse.json({ message: 'กรอกข้อมูลไม่ครบ' }, { status: 400 })
  }

  // กันชื่อวัคซีนซ้ำ (เคสพื้นฐาน; ถ้าต้องการให้ซ้ำได้ ให้ลบบล็อกนี้)
  const dup = await prisma.vaccine.findFirst({
    where: { name: String(name).trim() },
    select: { id: true },
  })
  if (dup) {
    return NextResponse.json({ message: 'มีชื่อวัคซีนนี้อยู่แล้ว' }, { status: 409 })
  }

  const created = await prisma.vaccine.create({
    data: {
      name: String(name).trim(),
      type: String(type).trim(),
      requiredDoses: Number(requiredDoses),
      usageType: String(usageType).trim(),
    },
    select: {
      id: true,
      name: true,
      type: true,
      requiredDoses: true,
      usageType: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(created, { status: 201 })
}
