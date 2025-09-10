// middleware.ts
import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware() {},
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname

        // ต้องมี token ก่อน
        if (!token) return false

        // /dashboard ต้องเป็น ADMIN
        if (path.startsWith('/dashboard') && (token as any).role !== 'ADMIN') {
          return false
        }

        // ส่วนอื่น ๆ (รวม API) STAFF/ADMIN เข้าถึงได้หมด
        return true
      },
    },
  }
)

// ✅ ระบุว่า middleware ทำงานกับ /home, /dashboard และ /api
// ❌ ยกเว้นบาง API ที่ต้องการให้ public
export const config = {
  matcher: [
    '/home/:path*',
    '/dashboard/:path*',
    '/api/:path*',
    // ถ้าอยาก exclude endpoint บางอัน เช่น GET พวก dropdown:
    // '/((?!api/patients|api/cine|api/warehouses|api/lots).*)',
  ],
}
