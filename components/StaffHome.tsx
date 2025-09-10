'use client'

import Link from 'next/link'
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
import { motion } from 'framer-motion'

export default function StaffHome({ name }: { name: string }) {
  const kpis = [
    { title: 'งานวันนี้', value: '12 เคส', icon: ClipboardDocumentListIcon, color: 'from-blue-500 to-cyan-500' },
    { title: 'ฉีดครบแล้ว', value: '345 ราย', icon: CheckCircleIcon, color: 'from-emerald-500 to-teal-500' },
    { title: 'ติดตามเพิ่มเติม', value: '8 ราย', icon: BellAlertIcon, color: 'from-amber-500 to-orange-500' },
  ]

  const notifications = [
    { message: 'วัคซีนเข็ม 2 ใกล้หมดอายุ', icon: BellAlertIcon },
    { message: 'การฉีดวัคซีนสำเร็จ', icon: CheckCircleIcon },
    { message: 'มีนัดหมายฉีดพรุ่งนี้ 09:30', icon: CalendarDaysIcon },
  ]

  return (
    <div className="relative min-h-screen bg-gradient-to-tr from-blue-100 via-teal-100 to-emerald-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Floating blobs (match login vibe) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-300/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-28 w-80 h-80 rounded-full bg-emerald-300/30 blur-3xl" />
      </div>

      <header className="relative px-4 pt-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-emerald-600 dark:from-blue-400 dark:to-emerald-400">
                👋
              </h1>
              <p className="text-gray-700 dark:text-gray-300 mt-1">ภาพรวมงานประจำวันของคุณอยู่ที่นี่</p>
            </div>

            <Link
              href="/cines"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:opacity-95 text-white px-4 py-2 shadow-lg"
            >
              <PlusCircleIcon className="w-5 h-5" />
              เพิ่มวัคซีน
            </Link>
          </div>
        </div>
      </header>

      <main className="relative px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* KPI Cards */}
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {kpis.map((c) => (
                <motion.div
                  key={c.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  whileHover={{ y: -2 }}
                  className="group relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-gray-900/50 border border-white/60 dark:border-white/10 shadow-xl"
                >
                  <div className="p-5 flex items-center">
                    <div className={`p-4 rounded-xl text-white mr-4 bg-gradient-to-br ${c.color} shadow`}>
                      <c.icon className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{c.title}</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{c.value}</p>
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </div>
          </section>

          {/* Quick Navigation */}
          <section aria-labelledby="quick-nav-heading">
            <div className="flex items-center justify-between mb-3">
              <h2 id="quick-nav-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
                เมนูลัด
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <NavTile
                href="/stock"
                title="คลังวัคซีน"
                icon={ShoppingCartIcon}
                iconBg="from-blue-600 to-cyan-500"
                tile="bg-white/70 dark:bg-gray-900/50"
              />
              <NavTile
                href="/lots"
                title="ล็อตวัคซีน"
                icon={CubeIcon}
                iconBg="from-emerald-600 to-teal-500"
                tile="bg-white/70 dark:bg-gray-900/50"
              />
              <NavTile
                href="/patients"
                title="ผู้รับวัคซีน"
                icon={UserIcon}
                iconBg="from-indigo-600 to-sky-500"
                tile="bg-white/70 dark:bg-gray-900/50"
              />
              <NavTile
                href="/vaccine"
                title="เพิ่มล็อต/รับเข้า"
                icon={PlusCircleIcon}
                iconBg="from-violet-600 to-fuchsia-500"
                tile="bg-white/70 dark:bg-gray-900/50"
              />
            </div>
          </section>

          {/* Notifications + Side panel */}
          <section aria-labelledby="notif-heading" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Notifications list */}
            <div className="lg:col-span-2">
              <h2 id="notif-heading" className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                การแจ้งเตือนล่าสุด
              </h2>
              <div className="rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-gray-900/50 border border-white/60 dark:border-white/10 shadow-xl divide-y divide-gray-100/70 dark:divide-white/10">
                {notifications.map((n, i) => (
                  <div key={i} className="flex items-center gap-3 p-4">
                    <span className="inline-flex p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow">
                      <n.icon className="w-5 h-5" />
                    </span>
                    <p className="text-gray-900 dark:text-gray-200">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Side panel: quick stats + actions */}
            <aside className="space-y-4">
              <div className="rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-gray-900/50 border border-white/60 dark:border-white/10 shadow-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex p-2 rounded-lg bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow">
                    <ChartBarIcon className="w-5 h-5" />
                  </span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">สรุปวันนี้</p>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">20</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">รายการทั้งหมด</span>
                </div>
              </div>

              <div className="rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-gray-900/50 border border-white/60 dark:border-white/10 shadow-xl p-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">ทางลัด</p>
                <div className="grid grid-cols-2 gap-2">
                  <ActionLink href="/vaccine" label="เพิ่มวัคซีน" icon={PlusCircleIcon} />
                  <ActionLink href="/patients" label="เพิ่มผู้รับวัคซีน" icon={UserIcon} />
                  <ActionLink href="/stock" label="ดูสต็อก" icon={ShoppingCartIcon} />
                  <ActionLink href="/lots" label="ดูล็อต" icon={CubeIcon} />
                </div>
              </div>
            </aside>
          </section>
        </div>
      </main>
    </div>
  )
}

/* -------------------- Subcomponents -------------------- */
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
  iconBg: string // tailwind gradient e.g. "from-blue-600 to-cyan-500"
  tile: string   // tile glass bg classes
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
        className={`flex items-center p-5 rounded-2xl ${tile} text-gray-900 dark:text-white border border-white/60 dark:border-white/10 shadow-xl hover:shadow-2xl transition`}
      >
        <div className={`p-4 rounded-xl mr-4 text-white bg-gradient-to-br ${iconBg} shadow`}>
          <Icon className="w-7 h-7" />
        </div>
        <div className="font-semibold">{title}</div>
        <ArrowRightCircleIcon className="w-5 h-5 ml-auto opacity-70" />
      </Link>
    </motion.div>
  )
}

function ActionLink({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-white/70 dark:bg-gray-800/70 border border-white/60 dark:border-white/10 text-gray-900 dark:text-gray-100 hover:bg-white/90 dark:hover:bg-gray-800/90 transition shadow"
    >
      <span className="inline-flex p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-emerald-500 text-white">
        <Icon className="w-4 h-4" />
      </span>
      <span className="font-medium">{label}</span>
    </Link>
  )
}
