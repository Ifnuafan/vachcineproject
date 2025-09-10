import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

  const item = await prisma.patient.findUnique({ where: { id } })
  if (!item) return NextResponse.json({ message: 'Not found' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

  const body = await req.json()
  const {
    fullName, birthDate, gender, cid,
    address, phone, allergies, underlyingConditions,
  } = body

  try {
    const updated = await prisma.patient.update({
      where: { id },
      data: {
        fullName,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        gender,
        cid,
        address,
        phone,
        allergies,
        underlyingConditions,
      },
    })
    return NextResponse.json(updated)
  } catch (e: any) {
  if (e.code === 'P2002') {
    return NextResponse.json({ message: 'CID ซ้ำในระบบ' }, { status: 409 })
  }
  // ⬇️ บรรทัดนี้คือของถูก
  return NextResponse.json({ message: 'อัปเดตไม่สำเร็จ' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

  await prisma.patient.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
