"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home, Syringe, Users, BarChart3, Shield, Settings, Menu, LogOut,
  PieChart as PieChartIcon, Bell, Activity, Hospital, Sparkles
} from "lucide-react"
import { motion } from "framer-motion"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell
} from "recharts"

function cn(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ")
}

/** ───────────────── Sidebar config ───────────────── */
const NAV = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: Home, color: "text-sky-700" },
  { href: "/cines", label: "วัคซีน", icon: Syringe, color: "text-emerald-600" },
  { href: "/vaccination-records", label: "บันทึกการฉีดวัคซีน", icon: Syringe, color: "text-sky-700" },
  { href: "/vaccination-records/history", label: "ประวัติผู้รับวัคซีน", icon: Users, color: "text-indigo-600" },
  { href: "/stock", label: "สต็อก", icon: BarChart3, color: "text-violet-600" },
  { href: "/lots", label: "ล็อตวัคซีน", icon: Shield, color: "text-pink-600" },
  { href: "/admin/users", label: "ผู้ใช้ / เจ้าหน้าที่", icon: Users, color: "text-amber-600" },
  { href: "/settings", label: "ตั้งค่า", icon: Settings, color: "text-slate-600" },
]

function ColorDot({ className = "" }: { className?: string }) {
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", className)} />
}

function Sidebar({ open, onSelect }: { open: boolean; onSelect?: () => void }) {
  const pathname = usePathname()
  return (
    <motion.aside
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 16 }}
      className={cn(
        // ➜ ทำให้สว่างขึ้น: พื้นหลังขาวโปร่ง + เส้นขอบอ่อน
        "relative border-r border-slate-200/80 backdrop-blur-xl bg-white/80 shadow-sm",
        open ? "block" : "hidden lg:block"
      )}
    >
      {/* Pastel aura เบามาก ๆ */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-sky-200/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 w-80 h-80 rounded-full bg-indigo-200/20 blur-3xl" />
      </div>

      <div className="h-16 px-5 flex items-center gap-2 font-extrabold bg-gradient-to-r from-sky-500 to-emerald-400 text-white shadow-sm">
        <Hospital className="h-6 w-6" />
        ระบบบริหารจัดการวัคซีน
      </div>
      <Separator />
      <ScrollArea className="h-[calc(100vh-4rem)] p-3">
        <nav className="space-y-1">
          {NAV.map(({ href, label, icon: Icon, color }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            return (
              <Link
                key={href}
                href={href}
                onClick={onSelect}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition group",
                  active
                    // ➜ active พาสเทลสว่าง
                    ? "bg-gradient-to-r from-sky-300 to-emerald-300 text-slate-900 ring-1 ring-sky-200 shadow-sm"
                    : "hover:bg-sky-50 text-slate-700"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="activeHighlight"
                    className="absolute left-0 top-0 h-full w-1.5 bg-emerald-400 rounded-r"
                  />
                )}
                <span
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200",
                    active ? "text-slate-900" : color
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="leading-none">{label}</span>
                {href === "/stock" && !active && <ColorDot className="ml-auto bg-violet-400" />}
                {href === "/lots" && !active && <ColorDot className="ml-auto bg-pink-400" />}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </motion.aside>
  )
}

/** ───────────────── การ์ดสถิติ ───────────────── */
function StatCard({
  title, value, icon: Icon, tone = "sky", hint,
}: {
  title: string; value: string; icon: any;
  tone?: "sky" | "emerald" | "pink" | "violet" | "amber"; hint?: string
}) {
  const toneMap: Record<string, { bg: string; text: string; ring: string }> = {
    sky: { bg: "bg-sky-100", text: "text-sky-700", ring: "ring-sky-200" },
    emerald: { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-200" },
    pink: { bg: "bg-pink-100", text: "text-pink-700", ring: "ring-pink-200" },
    violet: { bg: "bg-violet-100", text: "text-violet-700", ring: "ring-violet-200" },
    amber: { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-200" },
  }
  const t = toneMap[tone]

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 280, damping: 20 }}>
      {/* ➜ การ์ดขาวสะอาด + ring อ่อน */}
      <Card className="bg-white border-0 ring-1 ring-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base md:text-[17px] font-medium text-slate-700">{title}</CardTitle>
          <span className={cn("rounded-md p-2.5 ring-1", t.bg, t.text, t.ring)}>
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

export default function AdminDashboard() {
  const [open, setOpen] = useState(false)

  // mock data
  const doseData = useMemo(() => [
    { name: "โดสที่ 1", count: 500 },
    { name: "โดสที่ 2", count: 400 },
    { name: "ครบแล้ว", count: 345 },
  ], [])
  const transferData = useMemo(() => [
    { name: "คลังกลาง → รพ. A", value: 200 },
    { name: "คลังกลาง → รพ. B", value: 150 },
  ], [])
  const followData = useMemo(() => [
    { name: "ยังไม่ครบโดส", value: 120 },
    { name: "ครบโดสแล้ว", value: 1125 },
  ], [])

  const PIE_COLORS = ["#60A5FA", "#34D399", "#A78BFA", "#F472B6", "#38BDF8"]

  return (
    <div className="relative min-h-screen grid lg:grid-cols-[280px_1fr]">
      {/* ➜ พื้นหลัง Pastel Sky เหมือนหน้า Login แต่สว่างขึ้น */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-50 via-cyan-50 to-white" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-[26rem] h-[26rem] rounded-full bg-indigo-200/25 blur-3xl" />
        {/* grid ละมุนมาก ๆ */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[linear-gradient(to_right,rgba(14,165,233,.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(14,165,233,.25)_1px,transparent_1px)] bg-[size:28px_28px]" />
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar open={open} onSelect={() => setOpen(false)} />

      {/* Main */}
      <div className="flex flex-col">
        {/* Topbar สว่าง */}
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
          <div className="h-[68px] px-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((v) => !v)}>
                <Menu className="h-6 w-6 text-slate-700" />
              </Button>

              <div className="inline-flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-emerald-400 text-white shadow-sm">
                  <PieChartIcon className="h-5 w-5" />
                </span>
                <span className="text-xl font-extrabold bg-gradient-to-r from-sky-700 via-sky-600 to-emerald-600 text-transparent bg-clip-text">
                  แดชบอร์ด
                </span>
                <Sparkles className="h-4 w-4 text-emerald-500" />
              </div>

              <Badge variant="secondary" className="ml-2 hidden sm:inline-flex gap-1 text-sm">
                🌈 แอดมิน
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" title="การแจ้งเตือน" className="hidden sm:inline-flex">
                <span className="relative">
                  <Bell className="h-6 w-6 text-rose-500" />
                  <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white" />
                </span>
              </Button>

              <Button variant="outline" size="sm" asChild className="border-slate-300">
                <Link href="/auth/logout">
                  <LogOut className="h-5 w-5 mr-1 text-rose-500" /> ออกจากระบบ
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-5 md:p-7 space-y-7">
          {/* Quick actions – โทนพาสเทล */}
          <motion.div
            className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button asChild className="gap-2.5 py-2.5 px-4 shadow-sm hover:shadow bg-sky-500/10 text-sky-700 border border-sky-200">
              <Link href="/cines">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                  <Syringe className="h-4.5 w-4.5" />
                </span>
                <span className="text-[15px]">เพิ่มวัคซีน</span>
              </Link>
            </Button>
            <Button asChild variant="secondary" className="gap-2.5 py-2.5 px-4 shadow-sm hover:shadow bg-emerald-500/10 text-emerald-700 border border-emerald-200">
              <Link href="/patients">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  <Users className="h-4.5 w-4.5" />
                </span>
                <span className="text-[15px]">เพิ่มผู้รับวัคซีน</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" className="gap-2.5 py-2.5 px-4 hover:bg-indigo-50 text-indigo-700 border border-indigo-200 bg-white">
              <Link href="/stock">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
                  <BarChart3 className="h-4.5 w-4.5" />
                </span>
                <span className="text-[15px]">ดูสต็อก</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" className="gap-2.5 py-2.5 px-4 hover:bg-pink-50 text-pink-700 border border-pink-200 bg-white">
              <Link href="/lots">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-pink-100 text-pink-700">
                  <Shield className="h-4.5 w-4.5" />
                </span>
                <span className="text-[15px]">จัดการล็อตวัคซีน</span>
              </Link>
            </Button>
          </motion.div>

          {/* Stats */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard title="บัญชีเจ้าหน้าที่" value="2" icon={Users} tone="sky" hint="ทั้งหมดในระบบ" />
            <StatCard title="ผู้รับวัคซีนทั้งหมด" value="1,245 คน" icon={Activity} tone="emerald" hint="รวมทุกคลินิก" />
            <StatCard title="ใกล้หมด / หมดอายุ" value="5 รายการ" icon={Shield} tone="pink" hint="ต้องตรวจสอบ" />
          </div>

          {/* Charts – พื้นขาว */}
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2 bg-white ring-1 ring-slate-200 border-0 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5 text-slate-800 text-[15px] md:text-base font-semibold">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-700 ring-1 ring-sky-200">
                    <PieChartIcon className="h-4.5 w-4.5" />
                  </span>
                  สรุปการใช้งานระบบ
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[320px] md:h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={doseData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="จำนวนผู้รับวัคซีน" radius={[10, 10, 0, 0]} fill="#60A5FA" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white ring-1 ring-slate-200 border-0 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5 text-[15px] md:text-base font-semibold">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-violet-100 text-violet-700 ring-1 ring-violet-200">
                    <BarChart3 className="h-4.5 w-4.5" />
                  </span>
                  รายงานการโอนวัคซีน
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[320px] md:h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={transferData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                      {transferData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white ring-1 ring-slate-200 border-0 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5 text-[15px] md:text-base font-semibold">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                    <Users className="h-4.5 w-4.5" />
                  </span>
                  ติดตามการฉีดวัคซีน
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[320px] md:h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={followData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                      {followData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Bottom subtle glow */}
          <div className="pointer-events-none mx-auto w-[80%] h-20 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(125,211,252,.35),transparent)] rounded-full" />
        </main>
      </div>
    </div>
  )
}
