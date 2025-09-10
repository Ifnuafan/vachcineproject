'use client'

import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  UserIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'
import classNames from 'classnames'

/* ─────────── Helpers (Pastel UI) ─────────── */
function IconBadge({
  children,
  ring = true,
  size = 'sm',
}: {
  children: React.ReactNode
  ring?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const sz =
    size === 'sm'
      ? 'h-8 w-8 text-[14px]'
      : size === 'lg'
      ? 'h-12 w-12 text-[18px]'
      : 'h-10 w-10 text-[16px]'
  return (
    <span
      className={classNames(
        'inline-flex items-center justify-center rounded-xl text-white shadow-sm',
        // 💜💖💙: violet → fuchsia → sky
        'bg-gradient-to-tr from-violet-400 via-fuchsia-400 to-sky-400',
        ring && 'ring-1 ring-violet-200/60'
      )}
      style={{ backdropFilter: 'saturate(140%) blur(0.5px)' }}
    >
      <span className={classNames('flex items-center justify-center', sz)}>{children}</span>
    </span>
  )
}

function RainbowChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-700 bg-white shadow-sm ring-1 ring-slate-200">
      <span className="h-2 w-2 rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-sky-400" />
      {label}
    </span>
  )
}

/* ─────────── Logout Button ─────────── */
export function LogoutButton({ role }: { role?: string | null }) {
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/')
    router.refresh()
  }

  const roleText = role === 'ADMIN' ? 'แอดมิน' : 'เจ้าหน้าที่'

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-slate-800">
        <IconBadge size="sm">
          <UserIcon className="w-4.5 h-4.5" />
        </IconBadge>
        <RainbowChip label={roleText} />
      </div>

      <button
        onClick={handleLogout}
        // 💜💖💙 ปุ่มออกจากระบบ: violet → fuchsia → sky
        className="flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
        aria-label="ออกจากระบบ"
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5" />
        ออกจากระบบ
      </button>
    </div>
  )
}

/* ─────────── Header Bar (พื้นหลังม่วง–ชมพู–ฟ้า) ─────────── */
export function HeaderBar({
  role,
  children,
}: {
  role?: string | null
  children?: React.ReactNode
}) {
  return (
    <header className="relative isolate text-white">
  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-violet-300 via-violet-200 to-sky-300" />
  <div className="absolute inset-0 -z-10
    bg-[radial-gradient(1200px_500px_at_20%_-20%,rgba(139,92,246,0.25),transparent),
        radial-gradient(900px_400px_at_90%_-30%,rgba(56,189,248,0.25),transparent)]" />

  <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
    <div className="font-semibold tracking-wide drop-shadow-sm">
      ระบบบริหารจัดการวัคซีน
    </div>
    <LogoutButton role={role} />
  </div>

  {children ? <div className="mx-auto max-w-7xl px-4 pb-3">{children}</div> : null}
</header>

  )
}

export default LogoutButton
