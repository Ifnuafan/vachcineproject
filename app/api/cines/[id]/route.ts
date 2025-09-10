// app/api/cines/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// GET /api/cines/[id]
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

  const item = await prisma.vaccine.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      type: true,
      requiredDoses: true,
      usageType: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { lots: true } }, // เผื่อไว้ใช้งาน
    },
  })
  if (!item) return NextResponse.json({ message: 'Not found' }, { status: 404 })

  return NextResponse.json(item)
}

// PUT /api/cines/[id]
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const data: any = {}
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.type !== undefined) data.type = String(body.type).trim()
  if (body.requiredDoses !== undefined) data.requiredDoses = Number(body.requiredDoses)
  if (body.usageType !== undefined) data.usageType = String(body.usageType).trim()

  // กันชื่อซ้ำแบบง่าย ๆ (ถ้ามีเปลี่ยนชื่อ)
  if (data.name) {
    const dup = await prisma.vaccine.findFirst({
      where: { name: data.name, NOT: { id } },
      select: { id: true },
    })
    if (dup) return NextResponse.json({ message: 'มีชื่อวัคซีนนี้อยู่แล้ว' }, { status: 409 })
  }

  const updated = await prisma.vaccine.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      type: true,
      requiredDoses: true,
      usageType: true,
      updatedAt: true,
    },
  })
  return NextResponse.json(updated)
}

// DELETE /api/cines/[id]
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

  try {
    // ถ้ามี FK จาก VaccineLot (vaccineId) จะลบไม่ผ่าน → จับแล้วส่ง 409
    await prisma.vaccine.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ message: 'ลบไม่ได้ อาจมีล็อตที่อ้างอิงอยู่' }, { status: 409 })
  }
}
