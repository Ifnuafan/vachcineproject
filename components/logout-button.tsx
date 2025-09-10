'use client'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { UserIcon } from '@heroicons/react/24/outline'

export function LogoutButton({ role }: { role: string }) {
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/')
    router.refresh()
  }

  // แปลง role เป็นข้อความภาษาไทย
  const roleText = role === 'ADMIN' ? 'แอดมิน' : 'เจ้าหน้าที่'

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
        <UserIcon className="w-5 h-5" />
        <span>{roleText} </span>
      </div>
      <button
        onClick={handleLogout}
        className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700"
      >
        ออกจากระบบ
      </button>
    </div>
  )
}
