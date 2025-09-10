import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
        if (!user || !user.password) return null
        const ok = await bcrypt.compare(credentials.password, user.password)
        if (!ok) return null

        // ส่งข้อมูลที่จะไปอยู่ใน token
        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role, // Prisma enum: ADMIN | STAFF
        }
      },
    }),
  ],
  pages: {
    // ถ้ามีหน้า login ของคุณเอง ให้ใส่ path ตรงนี้
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      // ใส่ role/id ลง token ตอนล็อกอินครั้งแรก
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      // ผูก token -> session
      if (session.user) {
        (session.user as any).id = token.id as string
        ;(session.user as any).role = token.role as string
      }
      return session
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
