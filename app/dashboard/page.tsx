import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../api/auth/[...nextauth]/route'
import AdminDashboard from '@/components/AdminDashboard'
import { LogoutButton } from '@/components/logout-button'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/')
  if (session.user?.role !== 'ADMIN') redirect('/home')

  return (
    <>
      {/* Header ม่วง–ฟ้า (พาสเทล) */}
      <header className="relative isolate text-slate-800">
        {/* พื้นหลังหลัก ไล่เฉด: ม่วงพาสเทล → ฟ้าพาสเทล */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-violet-100 via-violet-50 to-sky-100" />
        {/* ไฮไลต์รัศมีโทนม่วง/ฟ้าแบบบาง ๆ */}
        <div className="absolute inset-0 -z-10
          bg-[radial-gradient(1200px_500px_at_20%_-20%,rgba(139,92,246,0.15),transparent),
              radial-gradient(900px_400px_at_90%_-30%,rgba(56,189,248,0.15),transparent)]" />

        {/* เนื้อหาแถบ */}
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          {/* โลโก้/ชื่อระบบพร้อมกรอบ+กลาส+glow (ม่วง→ฟ้า) */}
          <div className="relative inline-block">
            {/* glow ด้านหลัง */}
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-violet-400 to-sky-400 blur opacity-40" />
            {/* เนื้อหาพร้อมกรอบกลาส */}
            <div className="relative inline-flex items-center gap-2 rounded-xl px-4 py-2
                            font-semibold tracking-wide text-slate-800
                            bg-white/60 backdrop-blur-md ring-1 ring-violet-200 shadow-md">
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-violet-400 to-sky-400" />
              ระบบบริหารจัดการวัคซีน
            </div>
          </div>

          <LogoutButton role={session.user?.role ?? ''} />
        </div>
      </header>

      <AdminDashboard />
    </>
  )
}
