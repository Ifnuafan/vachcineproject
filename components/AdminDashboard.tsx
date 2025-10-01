'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Syringe, Users, BarChart3, Shield, Settings, Menu,
  PieChart as PieChartIcon, Bell, Activity, Hospital, Sparkles, Warehouse as WarehouseIcon
} from 'lucide-react'
import { motion } from 'framer-motion'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts'

function cn(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ')
}

/* ========================== Types (ตาม API ของคุณ) ========================== */
type WarehouseType = 'MAIN' | 'SUB'
type LotStatus = 'USABLE' | 'NEAR_EXPIRE' | 'EXPIRED'
type VaccinationStatus = 'COMPLETED' | 'POSTPONED' | 'CANCELED'

type VaccineLite = { id: number; name: string; type: string }
type LotLite = { lotNo: string; expirationDate: string; status: LotStatus }
type PatientLite = { id: number; fullName: string; cid: string }

type VaccRecord = {
  id: number
  patientId: number
  vaccineId: number
  lotNo: string
  vaccinationDate: string
  doseNumber?: number | null
  injectionSite?: string | null
  status: VaccinationStatus
  provider?: string | null
  remarks?: string | null
  patient?: PatientLite
  vaccine?: VaccineLite
  lot?: LotLite
}

type Paged<T> = { items: T[]; total: number; page: number; limit: number }

type Warehouse = { id: number; name: string; type: WarehouseType; note?: string | null }

type InventoryRow = {
  warehouseId: number
  lotNo: string
  quantity: number
  vaccineId: number | null
  vaccineName: string | null
  expirationDate: string | null
}

/* ========================== Sidebar ========================== */
const NAV = [
  { href: '/dashboard', label: 'แดชบอร์ด', icon: Home, color: 'text-sky-700' },
  { href: '/cines', label: 'วัคซีน', icon: Syringe, color: 'text-emerald-600' },
  { href: '/vaccination-records', label: 'บันทึกการฉีดวัคซีน', icon: Syringe, color: 'text-sky-700' },
  { href: '/vaccination-records/history', label: 'ประวัติผู้รับวัคซีน', icon: Users, color: 'text-indigo-600' },
  { href: '/stock', label: 'สต็อก', icon: BarChart3, color: 'text-violet-600' },
  { href: '/lots', label: 'ล็อตวัคซีน', icon: Shield, color: 'text-pink-600' },
  { href: '/admin/users', label: 'ผู้ใช้ / เจ้าหน้าที่', icon: Users, color: 'text-amber-600' },
  { href: '/settings', label: 'ตั้งค่า', icon: Settings, color: 'text-slate-600' },
]

function ColorDot({ className = '' }: { className?: string }) {
  return <span className={cn('inline-block h-2.5 w-2.5 rounded-full', className)} />
}

function Sidebar({ open, onSelect }: { open: boolean; onSelect?: () => void }) {
  const pathname = usePathname()
  return (
    <motion.aside
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 16 }}
      className={cn('relative border-r border-slate-200/80 backdrop-blur-xl bg-white/80 shadow-sm', open ? 'block' : 'hidden lg:block')}
    >
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
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={onSelect}
                className={cn(
                  'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition group',
                  active ? 'bg-gradient-to-r from-sky-300 to-emerald-300 text-slate-900 ring-1 ring-sky-200 shadow-sm' : 'hover:bg-sky-50 text-slate-700'
                )}
              >
                {active && (
                  <motion.span layoutId="activeHighlight" className="absolute left-0 top-0 h-full w-1.5 bg-emerald-400 rounded-r" />
                )}
                <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200', active ? 'text-slate-900' : color)}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="leading-none">{label}</span>
                {href === '/stock' && !active && <ColorDot className="ml-auto bg-violet-400" />}
                {href === '/lots' && !active && <ColorDot className="ml-auto bg-pink-400" />}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </motion.aside>
  )
}

/* ========================== Stat Card ========================== */
function StatCard({
  title, value, icon: Icon, tone = 'sky', hint,
}: {
  title: string; value: string | number; icon: any
  tone?: 'sky' | 'emerald' | 'pink' | 'violet' | 'amber'; hint?: string
}) {
  const toneMap: Record<string, { bg: string; text: string; ring: string }> = {
    sky: { bg: 'bg-sky-100', text: 'text-sky-700', ring: 'ring-sky-200' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-700', ring: 'ring-pink-200' },
    violet: { bg: 'bg-violet-100', text: 'text-violet-700', ring: 'ring-violet-200' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200' },
  }
  const t = toneMap[tone]

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 280, damping: 20 }}>
      <Card className="bg-white border-0 ring-1 ring-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base md:text-[17px] font-medium text-slate-700">{title}</CardTitle>
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

/* ========================== Helpers ========================== */
const PIE_COLORS = ['#60A5FA', '#34D399', '#A78BFA', '#F472B6', '#38BDF8', '#FBBF24', '#FB7185']

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function toKey(d: Date) { return startOfDay(d).toISOString().slice(0, 10) }
function fmt(num: number) { return Intl.NumberFormat().format(num) }

/* ========================== Main ========================== */
export default function AdminDashboard() {
  const [open, setOpen] = useState(false)

  // ---- Filters ----
  const [dayRange, setDayRange] = useState<7 | 30>(30) // 7 หรือ 30 วันล่าสุด
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehouseId, setWarehouseId] = useState<string>('all') // 'all' | id

  // ---- Data states ----
  const [patientsTotal, setPatientsTotal] = useState<number>(0)
  const [nearExpireTotal, setNearExpireTotal] = useState<number>(0)
  const [records, setRecords] = useState<VaccRecord[]>([])
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // ============ Fetchers ============
  useEffect(() => {
    let cancelled = false
    async function loadBasics() {
      try {
        setLoading(true)

        // 1) คลังทั้งหมด (สำหรับตัวเลือก)
        const whRes = await fetch(`/api/warehouses?limit=1000`, { cache: 'no-store' })
        const whJson = await whRes.json() as Paged<Warehouse>
        if (!cancelled) setWarehouses(whJson.items || [])

        // 2) จำนวนผู้ป่วยทั้งหมด (ใช้ total)
        const ptRes = await fetch(`/api/patients?page=1&limit=1`, { cache: 'no-store' })
        const ptJson = await ptRes.json() as Paged<PatientLite>
        if (!cancelled) setPatientsTotal(ptJson.total ?? 0)

        // 3) ล็อตใกล้หมดอายุ (ใช้ total)
        const neRes = await fetch(`/api/lots?status=NEAR_EXPIRE&page=1&limit=1&fefo=1`, { cache: 'no-store' })
        const neJson = await neRes.json()
        if (!cancelled) setNearExpireTotal(neJson?.total ?? 0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadBasics()
    return () => { cancelled = true }
  }, [])

  // บันทึก & แสดงกราฟตามช่วงเวลา เลือกจาก records ทั้งหมด (เราจะดึงมา 1000 แถวล่าสุดพอ)
  useEffect(() => {
    let cancelled = false
    async function loadRecordsAndInventory() {
      try {
        setLoading(true)
        // 4) ประวัติการฉีด (เราจะกรองช่วงวันฝั่ง FE)
        const recRes = await fetch(`/api/vaccination-records?page=1&limit=1000`, { cache: 'no-store' })
        const recJson = await recRes.json() as Paged<VaccRecord>
        if (!cancelled) setRecords(recJson.items || [])

        // 5) คงคลัง (ถ้าเลือกคลัง → จำกัดด้วย warehouseId; ถ้า all ไม่ส่ง)
        const url = warehouseId === 'all'
          ? `/api/inventory`
          : `/api/inventory?warehouseId=${encodeURIComponent(warehouseId)}`
        const invRes = await fetch(url, { cache: 'no-store' })
        const invJson = await invRes.json() as InventoryRow[]
        if (!cancelled) setInventoryRows(invJson || [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadRecordsAndInventory()
  }, [warehouseId])

  // ============ Derivations ============
  const dayKeys = useMemo(() => {
    // สร้างแกนวันที่ย้อนหลัง dayRange วัน (รวมวันนี้)
    const today = startOfDay(new Date())
    const keys: string[] = []
    for (let i = dayRange - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      keys.push(toKey(d))
    }
    return keys
  }, [dayRange])

  const recordsInRange = useMemo(() => {
    const minDate = new Date(); minDate.setDate(minDate.getDate() - (dayRange - 1))
    const start = startOfDay(minDate).getTime()
    return records.filter(r => {
      const t = new Date(r.vaccinationDate).getTime()
      return t >= start
    })
  }, [records, dayRange])

  // KPI: วันนี้ / 7วัน / 30วัน
  const todayKey = useMemo(() => toKey(new Date()), [])
  const dosesToday = useMemo(() => records.filter(r => r.vaccinationDate.slice(0,10) === todayKey).length, [records, todayKey])
  const doses7d = useMemo(() => records.filter(r => {
    const t = startOfDay(new Date(r.vaccinationDate)).getTime()
    const d7 = startOfDay(new Date()); d7.setDate(d7.getDate() - 6)
    return t >= d7.getTime()
  }).length, [records])

  // กราฟ: เข็มต่อวัน (bar)
  const doseData = useMemo(() => {
    const map = new Map<string, number>()
    for (const k of dayKeys) map.set(k, 0)
    for (const r of recordsInRange) {
      const key = r.vaccinationDate.slice(0, 10)
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1)
    }
    return dayKeys.map(k => ({ name: k, count: map.get(k) || 0 }))
  }, [dayKeys, recordsInRange])

  // กราฟ: สัดส่วนฉีดตามวัคซีน (pie)
  const pieByVaccine = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of recordsInRange) {
      const name = r.vaccine?.name || `Vaccine-${r.vaccineId}`
      map.set(name, (map.get(name) || 0) + 1)
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }))
  }, [recordsInRange])

  // กราฟ: ติดตามสถานะการฉีด (pie: COMPLETED/POSTPONED/CANCELED)
  const pieByStatus = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of recordsInRange) {
      map.set(r.status, (map.get(r.status) || 0) + 1)
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }))
  }, [recordsInRange])

  // KPI: on-hand รวมหรือของคลัง (sum จาก inventoryRows)
  const onHandTotal = useMemo(() => {
    return inventoryRows.reduce((acc, r) => acc + (r.quantity || 0), 0)
  }, [inventoryRows])

  return (
    <div className="relative min-h-screen grid lg:grid-cols-[280px_1fr]">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-50 via-cyan-50 to-white" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-[26rem] h-[26rem] rounded-full bg-indigo-200/25 blur-3xl" />
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[linear-gradient(to_right,rgba(14,165,233,.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(14,165,233,.25)_1px,transparent_1px)] bg-[size:28px_28px]" />
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar open={open} onSelect={() => setOpen(false)} />

      {/* Main */}
      <div className="flex flex-col">
        {/* Topbar */}
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

            <div className="flex items-center gap-3">
              {/* Filters */}
              <div className="hidden md:flex items-center gap-2">
                <Select value={String(dayRange)} onValueChange={(v) => setDayRange(Number(v) as 7 | 30)}>
                  <SelectTrigger className="w-[140px] bg-white/70">
                    <SelectValue placeholder="ช่วงเวลา" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 วันล่าสุด</SelectItem>
                    <SelectItem value="30">30 วันล่าสุด</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={warehouseId} onValueChange={(v) => setWarehouseId(v)}>
                  <SelectTrigger className="w-[200px] bg-white/70">
                    <SelectValue placeholder="เลือกคลัง" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกคลัง</SelectItem>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.name} ({w.type === 'MAIN' ? 'หลัก' : 'ย่อย'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="ghost" size="icon" title="การแจ้งเตือน" className="hidden sm:inline-flex">
                <span className="relative">
                  <Bell className="h-6 w-6 text-rose-500" />
                  <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white" />
                </span>
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-5 md:p-7 space-y-7">
          {/* Quick actions */}
          <motion.div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
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
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="เข็มที่ฉีดวันนี้" value={loading ? '…' : fmt(dosesToday)} icon={Activity} tone="emerald" hint="รวมทุกคลัง" />
            <StatCard title="ฉีดใน 7 วันล่าสุด" value={loading ? '…' : fmt(doses7d)} icon={PieChartIcon} tone="sky" hint="แนวโน้มสัปดาห์นี้" />
            <StatCard title="ผู้รับวัคซีนทั้งหมด" value={loading ? '…' : fmt(patientsTotal)} icon={Users} tone="violet" hint="ในระบบทั้งหมด" />
            <StatCard title="ล็อตใกล้หมดอายุ" value={loading ? '…' : fmt(nearExpireTotal)} icon={Shield} tone="pink" hint="ควรจัดการโดยเร็ว" />
          </div>

          {/* Charts */}
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2 bg-white ring-1 ring-slate-200 border-0 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5 text-slate-800 text-[15px] md:text-base font-semibold">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-700 ring-1 ring-sky-200">
                    <BarChart3 className="h-4.5 w-4.5" />
                  </span>
                  จำนวนการฉีดต่อวัน (ย้อนหลัง {dayRange} วัน)
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
                    <PieChartIcon className="h-4.5 w-4.5" />
                  </span>
                  สัดส่วนการฉีดตามวัคซีน
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[320px] md:h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieByVaccine} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                      {pieByVaccine.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
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
                  ติดตามสถานะการฉีด (ช่วง {dayRange} วัน)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[320px] md:h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieByStatus} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                      {pieByStatus.map((_, i) => (<Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* สรุปคงคลัง (ถ้าต้องการโชว์เร็ว ๆ) */}
          <Card className="bg-white ring-1 ring-slate-200 border-0 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5 text-[15px] md:text-base font-semibold">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                  <WarehouseIcon className="h-4.5 w-4.5" />
                </span>
                คงคลังภาพรวม {warehouseId === 'all' ? '(ทุกคลัง)' : `(คลัง ${warehouses.find(w => String(w.id) === warehouseId)?.name || warehouseId})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-slate-700">
              {loading ? 'กำลังโหลด…' : (
                <div className="flex flex-wrap items-center gap-4">
                  <Badge variant="outline" className="text-slate-700 bg-slate-50 border-slate-200">
                    คงเหลือรวม: <span className="ml-1 font-semibold">{fmt(onHandTotal)}</span> โดส
                  </Badge>
                  <div className="text-sm text-slate-500">
                    * คำนวณจาก /api/inventory โดยรวมจำนวนต่อคลัง-ต่อล็อต
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom subtle glow */}
          <div className="pointer-events-none mx-auto w-[80%] h-20 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(125,211,252,.35),transparent)] rounded-full" />
        </main>
      </div>
    </div>
  )
}
