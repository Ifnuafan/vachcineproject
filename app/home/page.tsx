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
      <div className="p-4 flex justify-between items-center">
        {/* ส่วนโชว์ว่าเข้าสู่ระบบแล้ว */}
        <div className="flex items-center gap-2 text-gray-700">
          <span className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
            👤
          </span>
          <span>
            ตำเเหน่งพยาบาล: {session.user?.role === 'STAFF' ? 'เจ้าหน้าที่' : session.user?.role || 'ไม่ระบุ'}  
          </span>
        </div>

        {/* ปุ่มออกจากระบบ พร้อมส่ง role ไปด้วยถ้าจำเป็น */}
        <LogoutButton role={session.user?.role || ''} />
      </div>

      <StaffHome name={session.user?.name || 'ผู้ใช้'} />
    </>
  )
}
