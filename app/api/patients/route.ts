import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || ''
  const page = Number(searchParams.get('page') || 1)
  const limit = Number(searchParams.get('limit') || 10)
  const skip = (page - 1) * limit

  const where = q
    ? {
        OR: [
          { fullName: { contains: q } },
          { cid: { contains: q } },
          { phone: { contains: q } },
          { allergies: { contains: q } },
          { underlyingConditions: { contains: q } },
        ],
      }
    : {}

  const [items, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.patient.count({ where }),
  ])

  return NextResponse.json({ items, total, page, limit })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    fullName, birthDate, gender, cid,
    address, phone, allergies, underlyingConditions,
  } = body

  if (!fullName || !birthDate || !gender || !cid) {
    return NextResponse.json({ message: 'กรอกข้อมูลไม่ครบ' }, { status: 400 })
  }

  try {
    const created = await prisma.patient.create({
      data: {
        fullName,
        birthDate: new Date(birthDate),
        gender,
        cid,
        address: address ?? null,
        phone: phone ?? null,
        allergies: allergies ?? null,
        underlyingConditions: underlyingConditions ?? null,
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ message: 'CID ซ้ำในระบบ' }, { status: 409 })
    }
    return NextResponse.json({ message: 'สร้างไม่สำเร็จ', detail: e?.message }, { status: 500 })
  }
}
