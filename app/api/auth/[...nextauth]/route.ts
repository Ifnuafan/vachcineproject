// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// ---- Prisma: กัน multiple instances ตอน dev ----
const globalForPrisma = global as unknown as { prisma?: PrismaClient }
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // dev: เห็น query เพื่อดีบัก / prod: เงียบเพื่อความเร็ว
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,

  // ใช้ JWT เพื่อตัดการอ่าน/เขียน session ใน DB ทุกรีเควสต์
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8, updateAge: 60 * 30 }, // 8 ชม., refresh ทุก 30 นาที
  jwt: { maxAge: 60 * 60 * 8 },

  // ===== Providers =====
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase()
        const password = credentials?.password
        if (!email || !password) return null

        // ดึงเฉพาะฟิลด์ที่ต้องใช้
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, password: true, role: true, name: true },
        })
        if (!user?.password) return null

        const ok = await bcrypt.compare(password, user.password)
        if (!ok) return null

        // return ค่าที่จะถูกส่งเข้ามาใน callback.jwt (พารามิเตอร์ user)
        return {
          id: String(user.id),
          name: user.name ?? '',
          email: user.email,
          role: user.role, // 'ADMIN' | 'STAFF'
        }
      },
    }),
  ],

  // ===== Custom pages =====
  pages: {
    signIn: '/login', // ใช้เพจของคุณเอง
  },

  // ===== Callbacks =====
  callbacks: {
    // map role/id ลง token รอบ login เท่านั้น (อย่าคิวรี DB เพิ่มที่นี่)
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
      }
      return token
    },

    // ผูก token -> session ให้ client อ่าน role/id ได้ทันที
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
      }
      return session
    },

    // redirect แบบสั้น ๆ กันหลงไป API/โดเมนนอก
    async redirect({ url, baseUrl }) {
      // อนุญาตเฉพาะภายในโดเมน/พาธ
      const isInternal = url.startsWith('/') || url.startsWith(baseUrl)
      // กัน /api/*
      if (!isInternal || url.includes('/api/')) {
        return `${baseUrl}/dashboard`
      }
      // normalize ให้เป็น absolute
      return url.startsWith('/') ? `${baseUrl}${url}` : url
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
