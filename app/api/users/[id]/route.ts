// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

  try {
    const body = await req.json()
    const { name, role, password } = body ?? {}

    const data: any = {}
    if (name !== undefined) data.name = String(name)
    if (role !== undefined) {
      if (!Object.values(UserRole).includes(role)) {
        return NextResponse.json({ message: 'role ไม่ถูกต้อง' }, { status: 400 })
      }
      data.role = role
    }
    if (password) {
      data.password = await bcrypt.hash(String(password), 10)
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ message: 'อัปเดตไม่สำเร็จ' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

  try {
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ message: 'ลบไม่สำเร็จ' }, { status: 400 })
  }
}
