'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  BellAlertIcon,
  ShoppingCartIcon,
  UserIcon,
  CubeIcon,
  PlusCircleIcon,
  ArrowRightCircleIcon,
  ChartBarIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

/** ===== helper ===== */
function cn(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ')
}

/** ===== StatCard (สไตล์เดียวกับ Dashboard) ===== */
function StatCard({
  title,
  value,
  icon: Icon,
  tone = 'sky',
  hint,
}: {
  title: string
  value: string
  icon: any
  tone?: 'sky' | 'emerald' | 'amber'
  hint?: string
}) {
  const toneMap: Record<
    string,
    { bg: string; text: string; ring: string }
  > = {
    sky: { bg: 'bg-sky-100', text: 'text-sky-700', ring: 'ring-sky-200' },
    emerald: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      ring: 'ring-emerald-200',
    },
    amber: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      ring: 'ring-amber-200',
    },
  }
  const t = toneMap[tone]

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 280, damping: 20 }}>
      <Card className="bg-white border-0 ring-1 ring-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base md:text-[17px] font-medium text-slate-700">
            {title}
          </CardTitle>
          <span className={cn('rounded-md p-2.5 ring-1', t.bg, t.text, t.ring)}>
            <Icon className="h-5 w-5" />
          </span>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-slate-900">{value}</div>
          {hint && <p className="text-sm text-slate-500 mt-1.5">{hint}</p>}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/** ===== NavTile (โทน/โครงเหมือน quick actions ใน Dashboard) ===== */
function NavTile({
  href,
  title,
  icon: Icon,
  iconBg,
  tile,
}: {
  href: string
  title: string
  icon: any
  iconBg: string // e.g. "from-blue-600 to-cyan-500"
  tile: string // e.g. "bg-white"
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -3 }}
      className="rounded-2xl overflow-hidden"
    >
      <Link
        href={href}
        className={cn(
          'flex items-center p-5 rounded-2xl text-slate-900 border border-slate-200/80 bg-white shadow-sm hover:shadow transition',
          tile
        )}
      >
        <div className={cn('p-4 rounded-xl mr-4 text-white bg-gradient-to-br', iconBg, 'shadow')}>
          <Icon className="w-7 h-7" />
        </div>
        <div className="font-semibold">{title}</div>
        <ArrowRightCircleIcon className="w-5 h-5 ml-auto opacity-70" />
      </Link>
    </motion.div>
  )
}

/** ===== ActionLink (สไตล์กระดุม glass ขาวเหมือนแม่แบบ) ===== */
function ActionLink({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-white border border-slate-200/80 text-slate-900 hover:bg-slate-50 transition shadow-sm"
    >
      <span className="inline-flex p-1.5 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 text-white">
        <Icon className="w-4 h-4" />
      </span>
      <span className="font-medium">{label}</span>
    </Link>
  )
}

/** ===== หน้า StaffHome ที่ “หน้าตาเดียวกับ Dashboard แม่แบบ” ===== */
export default function StaffHome({ name }: { name: string }) {
  const kpis = [
    {
      title: 'งานวันนี้',
      value: '12 เคส',
      icon: ClipboardDocumentListIcon,
      tone: 'sky' as const,
      hint: 'รวมเคสที่ต้องดำเนินการ',
    },
    {
      title: 'ฉีดครบแล้ว',
      value: '345 ราย',
      icon: CheckCircleIcon,
      tone: 'emerald' as const,
      hint: 'สะสมทั้งหมด',
    },
    {
      title: 'ติดตามเพิ่มเติม',
      value: '8 ราย',
      icon: BellAlertIcon,
      tone: 'amber' as const,
      hint: 'ต้องนัดหมายต่อ',
    },
  ]

  const notifications = [
    { message: 'วัคซีนเข็ม 2 ใกล้หมดอายุ', icon: BellAlertIcon },
    { message: 'การฉีดวัคซีนสำเร็จ', icon: CheckCircleIcon },
    { message: 'มีนัดหมายฉีดพรุ่งนี้ 09:30', icon: CalendarDaysIcon },
  ]

  return (
    <div className="relative min-h-screen">
      {/* พื้นหลัง Pastel Sky แบบเดียวกับ Dashboard */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-50 via-cyan-50 to-white" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-[26rem] h-[26rem] rounded-full bg-indigo-200/25 blur-3xl" />
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[linear-gradient(to_right,rgba(14,165,233,.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(14,165,233,.25)_1px,transparent_1px)] bg-[size:28px_28px]" />
        </div>
      </div>

      {/* Topbar สว่างเหมือนแม่แบบ */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="h-[68px] px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-emerald-400 text-white shadow-sm">
                <ChartBarIcon className="h-5 w-5" />
              </span>
              <span className="text-xl font-extrabold bg-gradient-to-r from-sky-700 via-sky-600 to-emerald-600 text-transparent bg-clip-text">
                แดชบอร์ดเจ้าหน้าที่
              </span>
            </div>
            <Badge variant="secondary" className="ml-2 hidden sm:inline-flex gap-1 text-sm">
              👤 {name || 'เจ้าหน้าที่'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" className="gap-2.5 py-2.5 px-4 shadow-sm hover:shadow bg-emerald-500/10 text-emerald-700 border border-emerald-200">
              <Link href="/patients">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  <UserIcon className="h-4.5 w-4.5" />
                </span>
                เพิ่มผู้รับวัคซีน
              </Link>
            </Button>
            <Button asChild className="gap-2.5 py-2.5 px-4 shadow-sm hover:shadow bg-sky-500/10 text-sky-700 border border-sky-200">
              <Link href="/cines">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                  <PlusCircleIcon className="h-4.5 w-4.5" />
                </span>
                เพิ่มวัคซีน
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="p-5 md:p-7 space-y-7">
        {/* KPI Cards – โทนเดียวกัน */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {kpis.map((k) => (
            <StatCard
              key={k.title}
              title={k.title}
              value={k.value}
              icon={k.icon}
              tone={k.tone}
              hint={k.hint}
            />
          ))}
        </div>

        {/* Quick actions – โทนพาสเทลเดียวกัน */}
        <motion.div
          className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            asChild
            className="gap-2.5 py-2.5 px-4 shadow-sm hover:shadow bg-sky-500/10 text-sky-700 border border-sky-200"
          >
            <Link href="/stock">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                <ShoppingCartIcon className="h-4.5 w-4.5" />
              </span>
              ดูสต็อก
            </Link>
          </Button>

          <Button
            asChild
            variant="secondary"
            className="gap-2.5 py-2.5 px-4 shadow-sm hover:shadow bg-emerald-500/10 text-emerald-700 border border-emerald-200"
          >
            <Link href="/lots">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                <CubeIcon className="h-4.5 w-4.5" />
              </span>
              จัดการล็อตวัคซีน
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            className="gap-2.5 py-2.5 px-4 hover:bg-indigo-50 text-indigo-700 border border-indigo-200 bg-white"
          >
            <Link href="/patients">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
                <UserIcon className="h-4.5 w-4.5" />
              </span>
              รายชื่อผู้รับวัคซีน
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            className="gap-2.5 py-2.5 px-4 hover:bg-pink-50 text-pink-700 border border-pink-200 bg-white"
          >
            <Link href="/vaccine">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-pink-100 text-pink-700">
                <PlusCircleIcon className="h-4.5 w-4.5" />
              </span>
              เพิ่มล็อต / รับเข้า
            </Link>
          </Button>
        </motion.div>

        {/* Notifications + Side panel – การ์ดขาว ring-1 เหมือนแม่แบบ */}
        <section aria-labelledby="notif-heading" className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <Card className="bg-white ring-1 ring-slate-200 border-0 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5 text-slate-800 text-[15px] md:text-base font-semibold">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                    <BellAlertIcon className="h-4.5 w-4.5" />
                  </span>
                  การแจ้งเตือนล่าสุด
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100">
                {notifications.map((n, i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <span className="inline-flex p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow">
                      <n.icon className="w-5 h-5" />
                    </span>
                    <p className="text-slate-800">{n.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-5">
            <Card className="bg-white ring-1 ring-slate-200 border-0 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5 text-[15px] md:text-base font-semibold">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-700 ring-1 ring-sky-200">
                    <ChartBarIcon className="h-4.5 w-4.5" />
                  </span>
                  สรุปวันนี้
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">20</span>
                  <span className="text-sm text-slate-600">รายการทั้งหมด</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white ring-1 ring-slate-200 border-0 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-[15px] md:text-base font-semibold text-slate-800">
                  ทางลัด
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <ActionLink href="/cines" label="เพิ่มวัคซีน" icon={PlusCircleIcon} />
                  <ActionLink href="/patients" label="เพิ่มผู้รับวัคซีน" icon={UserIcon} />
                  <ActionLink href="/stock" label="ดูสต็อก" icon={ShoppingCartIcon} />
                  <ActionLink href="/lots" label="ดูล็อต" icon={CubeIcon} />
                </div>
              </CardContent>
            </Card>
          </aside>
        </section>

        {/* Bottom subtle glow */}
        <div className="pointer-events-none mx-auto w-[80%] h-20 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(125,211,252,.35),transparent)] rounded-full" />
      </main>
    </div>
  )
}
