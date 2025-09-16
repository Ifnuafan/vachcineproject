import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../api/auth/[...nextauth]/route'
import StaffHome from '@/components/StaffHome'
import { LogoutButton } from '@/components/logout-button'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/')

  // ถ้าจะจำกัดเฉพาะ STAFF ให้ปลดคอมเมนต์บรรทัดล่าง
  // if (session.user?.role !== 'STAFF') redirect('/dashboard')

  return (
    <>
      {/* ── Header ฟ้า-ม่วงพาสเทล ไล่เฉด + aura เบา ๆ เหมือนหน้า dashboard ── */}
      <header className="relative isolate sticky top-0 z-40 border-b border-slate-200/80 bg-white/70 backdrop-blur-xl">
        {/* Gradient layer + aura */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-300/25 via-sky-200/20 to-violet-300/25" />
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-sky-300/35 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 w-72 h-72 rounded-full bg-violet-300/30 blur-3xl" />
        </div>

        <div className="h-[68px] px-4 flex items-center justify-between">
          {/* ส่วนโชว์ว่าเข้าสู่ระบบแล้ว */}
          <div className="flex items-center gap-3 text-slate-800">
            <span className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm
                             bg-gradient-to-br from-violet-600 to-sky-500 ring-1 ring-white/50">
              👤
            </span>
            <span className="font-medium">
              ตำเเหน่งพยาบาล:{' '}
              <span className="font-semibold bg-gradient-to-r from-sky-700 via-sky-600 to-violet-600 bg-clip-text text-transparent">
                {session.user?.role === 'STAFF' ? 'เจ้าหน้าที่' : (session.user?.role || 'ไม่ระบุ')}
              </span>
            </span>
          </div>

          {/* ปุ่มออกจากระบบ */}
          <LogoutButton role={session.user?.role || ''} />
        </div>
      </header>

      {/* เนื้อหาหลัก (StaffHome มีแบ็กกราวด์พาสเทลของตัวเองแล้ว) */}
      <StaffHome name={session.user?.name || 'ผู้ใช้'} />
    </>
  )
}
