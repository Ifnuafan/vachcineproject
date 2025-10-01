'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Syringe, Activity, Building2, Sparkles, BarChart3, Shield,
  User as UserIcon, Boxes, CheckCircle2, AlertTriangle, CalendarDays, ArrowRightCircle,
  Search, RefreshCcw, Download, PackageOpen, Info, BadgeCheck, PlusCircle
} from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

/* ====================== Types ====================== */
type WarehouseType = 'MAIN' | 'SUB'
type LotStatus = 'USABLE' | 'NEAR_EXPIRE' | 'EXPIRED'
type VaccinationStatus = 'COMPLETED' | 'POSTPONED' | 'CANCELED'

type Warehouse = { id: number; name: string; type: WarehouseType }
type InventoryRow = {
  warehouseId: number
  lotNo: string
  quantity: number
  vaccineId: number | null
  vaccineName: string | null
  expirationDate: string | null
}
type VaccRecordListItem = {
  id: number
  vaccinationDate: string
  vaccineId: number
  status: VaccinationStatus
  doseNumber: number | null
  lot?: { lotNo: string; expirationDate: string | null; status: LotStatus }
  patient?: { id: number; fullName: string; cid: string }
  vaccine?: { id: number; name: string; type: string }
}
type Paged<T> = { items: T[]; total: number; page: number; limit: number }
type LotItem = {
  lotNo: string
  expirationDate: string
  status: LotStatus
  vaccine: { id: number; name: string; type: string }
}

/* ====================== Utils ====================== */
const fmt = (n: number) => Intl.NumberFormat().format(n)
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const todayKey = startOfDay(new Date()).toISOString().slice(0, 10)
const cn = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ')
const toCSV = (rows: Array<Record<string, any>>) => {
  const headers = Object.keys(rows[0] || {})
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))]
  return new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
}

/* ====================== Page ====================== */
export default function StaffHomePage() {
  // ฟิลเตอร์คลัง + ค้นหา + รีเฟรช
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehouseId, setWarehouseId] = useState<string>('all')
  const [query, setQuery] = useState('')

  // ข้อมูล
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<VaccRecordListItem[]>([])
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([])
  const [nearExpire, setNearExpire] = useState<LotItem[]>([])
  const [nearExpireTotal, setNearExpireTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function loadAll(init = false) {
    setError(null)
    setLoading(true)
    try {
      if (init) {
        const wh = await fetch('/api/warehouses?limit=1000', { cache: 'no-store' }).then(r => r.json()) as Paged<Warehouse>
        setWarehouses(wh.items || [])
      }

      const [ne, rec] = await Promise.all([
        fetch('/api/lots?status=NEAR_EXPIRE&fefo=1&page=1&limit=10', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/vaccination-records?page=1&limit=500', { cache: 'no-store' }).then(r => r.json()) as Promise<Paged<VaccRecordListItem>>,
      ])
      setNearExpire(ne.items || [])
      setNearExpireTotal(ne.total || 0)
      setRecords(rec.items || [])

      const url = warehouseId === 'all' ? '/api/inventory' : `/api/inventory?warehouseId=${warehouseId}`
      const inv = await fetch(url, { cache: 'no-store' }).then(r => r.json()) as InventoryRow[]
      setInventoryRows(inv || [])
    } catch (e: any) {
      setError(e?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  // init
  useEffect(() => { loadAll(true) }, [])
  // reload เมื่อเปลี่ยนคลัง
  useEffect(() => { loadAll(false) }, [warehouseId])

  /* ====================== KPIs ====================== */
  const dosesToday = useMemo(
    () => records.filter(r => r.vaccinationDate.slice(0, 10) === todayKey).length,
    [records]
  )
  const completedTotal = useMemo(
    () => records.filter(r => r.status === 'COMPLETED').length,
    [records]
  )
  const followUpCount = useMemo(
    () => records.filter(r => r.status === 'POSTPONED').length,
    [records]
  )
  const onHandTotal = useMemo(
    () => inventoryRows.reduce((s, r) => s + (r.quantity || 0), 0),
    [inventoryRows]
  )

  // รวมคงคลังต่อวัคซีน (Top 8) + ค้นหา
  const onHandByVaccine = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of inventoryRows) {
      const name = r.vaccineName || `Vaccine-${r.vaccineId}`
      map.set(name, (map.get(name) || 0) + (r.quantity || 0))
    }
    let rows = [...map.entries()].map(([name, qty]) => ({ name, qty }))
    if (query.trim()) rows = rows.filter(r => r.name.toLowerCase().includes(query.toLowerCase()))
    return rows.sort((a, b) => b.qty - a.qty).slice(0, 8)
  }, [inventoryRows, query])

  // ล็อตใกล้หมดอายุ — กรองให้สัมพันธ์กับคลังที่เลือก (มีสต็อกในคลังนั้น)
  const filteredNearExpire = useMemo(() => {
    if (warehouseId === 'all') return nearExpire
    const wid = Number(warehouseId)
    const lotInWh = new Set(inventoryRows.filter(r => r.warehouseId === wid && r.quantity > 0).map(r => r.lotNo))
    return nearExpire.filter(ne => lotInWh.has(ne.lotNo))
  }, [nearExpire, inventoryRows, warehouseId])

  // การฉีดล่าสุด 8 รายการ
  const recentVaccinations = useMemo(
    () =>
      [...records]
        .sort((a, b) => +new Date(b.vaccinationDate) - +new Date(a.vaccinationDate))
        .slice(0, 8),
    [records]
  )

  // Export CSV
  function exportOnHandCSV() {
    if (onHandByVaccine.length === 0) return
    const blob = toCSV(onHandByVaccine.map(r => ({ vaccine: r.name, on_hand: r.qty })))
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'onhand_by_vaccine.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ====================== UI ====================== */
  return (
    <div className="relative min-h-screen text-slate-800">
      {/* background นุ่ม ๆ */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-50 via-emerald-50 to-white" />
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sky-200/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-[26rem] h-[26rem] rounded-full bg-emerald-200/20 blur-3xl" />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-5">
        <div className="inline-flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-sky-500 text-white shadow">
            <Syringe className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-slate-800 via-slate-900 to-slate-700 bg-clip-text text-transparent">
              หน้าหลักเจ้าหน้าที่
            </h1>
            <p className="text-slate-600 text-sm">สรุปงานวันนี้ • ล็อตที่ต้องรีบใช้ • คงคลังตามคลังที่เลือก</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 border border-slate-300 bg-white rounded-md h-9 px-2">
            <Building2 className="h-4 w-4 text-slate-500" />
            <select
              className="text-sm outline-none bg-transparent"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              aria-label="เลือกคลัง"
            >
              <option value="all">ทุกคลัง</option>
              {warehouses.map(w => (
                <option value={String(w.id)} key={w.id}>
                  {w.name} ({w.type === 'MAIN' ? 'หลัก' : 'ย่อย'})
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex items-center gap-2 border border-slate-300 bg-white rounded-md h-9 px-3">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาวัคซีน..."
              className="text-sm outline-none bg-transparent placeholder:text-slate-400"
            />
          </div>

          <Button variant="outline" className="h-9 gap-2 border-slate-300" onClick={() => loadAll(false)}>
            <RefreshCcw className="h-4 w-4" /> รีเฟรช
          </Button>

          <Badge variant="secondary" className="hidden sm:inline-flex">STAFF</Badge>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Quick Actions */}
      <motion.div
        className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 mb-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button asChild className="gap-2.5 py-2.5 px-4 shadow-sm hover:shadow bg-emerald-500/10 text-emerald-700 border border-emerald-200">
          <Link href="/vaccination-records">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
              <Syringe className="h-4 w-4" />
            </span>
            บันทึกการฉีด
          </Link>
        </Button>
        <Button asChild variant="ghost" className="gap-2.5 py-2.5 px-4 hover:bg-indigo-50 text-indigo-700 border border-indigo-200 bg-white">
          <Link href="/stock">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
              <BarChart3 className="h-4 w-4" />
            </span>
            ดูสต็อก
          </Link>
        </Button>
        <Button asChild variant="ghost" className="gap-2.5 py-2.5 px-4 hover:bg-pink-50 text-pink-700 border border-pink-200 bg-white">
          <Link href="/lots">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-pink-100 text-pink-700">
              <Shield className="h-4 w-4" />
            </span>
            ล็อตใกล้หมดอายุ
          </Link>
        </Button>
        <Button asChild variant="ghost" className="gap-2.5 py-2.5 px-4 hover:bg-amber-50 text-amber-700 border border-amber-200 bg-white">
          <Link href="/patients">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700">
              <UserIcon className="h-4 w-4" />
            </span>
            เพิ่มผู้รับวัคซีน
          </Link>
        </Button>
      </motion.div>

      {/* KPIs */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        {[
          { title: 'เข็มที่ฉีดวันนี้', value: fmt(loading ? 0 : dosesToday), icon: Activity, tone: 'emerald' },
          { title: 'ฉีดครบแล้ว (สะสม)', value: fmt(loading ? 0 : completedTotal), icon: CheckCircle2, tone: 'sky' },
          { title: 'ติดตามเพิ่มเติม', value: fmt(loading ? 0 : followUpCount), icon: CalendarDays, tone: 'amber' },
          { title: 'คงคลังรวม', value: `${fmt(loading ? 0 : onHandTotal)} โดส`, icon: Boxes, tone: 'violet' },
        ].map((k) => (
          <Card key={k.title} className="bg-white border-0 ring-1 ring-slate-200 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[15px] font-semibold text-slate-800">{k.title}</CardTitle>
              <span className={cn(
                'rounded-md p-2.5 ring-1',
                k.tone === 'emerald' && 'bg-emerald-100 text-emerald-700 ring-emerald-200',
                k.tone === 'sky' && 'bg-sky-100 text-sky-700 ring-sky-200',
                k.tone === 'amber' && 'bg-amber-100 text-amber-700 ring-amber-200',
                k.tone === 'violet' && 'bg-violet-100 text-violet-700 ring-violet-200',
              )}>
                <k.icon className="h-5 w-5" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{loading ? '…' : k.value}</div>
              {k.title === 'คงคลังรวม' && (
                <p className="text-sm text-slate-600 mt-1.5">
                  {warehouseId === 'all' ? 'ทุกคลัง' : `คลัง ${warehouses.find(w => String(w.id) === warehouseId)?.name ?? warehouseId}`}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* กลุ่มตารางหลัก */}
      <section className="grid gap-5 xl:grid-cols-3">
        {/* ตาราง: คงคลังตามวัคซีน (Top 8) */}
        <Card className="bg-white border-0 ring-1 ring-slate-200 shadow-sm rounded-2xl xl:col-span-1">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-[15px] md:text-base font-semibold text-slate-900 flex items-center gap-2">
              <Boxes className="h-5 w-5 text-violet-600" /> คงคลังตามวัคซีน (อันดับสูงสุด)
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-2 border-slate-300" onClick={exportOnHandCSV}>
                <Download className="h-4 w-4" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b border-slate-200">
                  <th className="py-2 pr-2 font-semibold">วัคซีน</th>
                  <th className="py-2 pr-2 font-semibold">คงเหลือ</th>
                </tr>
              </thead>
              <tbody className="text-slate-800">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-3 pr-2"><div className="h-4 w-40 bg-slate-200/70 rounded animate-pulse" /></td>
                      <td className="py-3 pr-2"><div className="h-4 w-16 bg-slate-200/70 rounded animate-pulse" /></td>
                    </tr>
                  ))
                ) : onHandByVaccine.length === 0 ? (
                  <tr><td className="py-6 text-center text-slate-500" colSpan={2}><PackageOpen className="inline h-4 w-4 mr-1" /> ไม่มีข้อมูล</td></tr>
                ) : (
                  onHandByVaccine.map((r, idx) => (
                    <tr key={r.name} className={cn('border-b border-slate-100 hover:bg-slate-50/60', idx % 2 === 0 && 'bg-slate-50/40')}>
                      <td className="py-2.5 pr-2 font-medium">{r.name}</td>
                      <td className="py-2.5 pr-2">{fmt(r.qty)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ตาราง: ล็อตใกล้หมดอายุ + ปุ่มลัด */}
        <Card className="bg-white border-0 ring-1 ring-slate-200 shadow-sm rounded-2xl xl:col-span-1">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-[15px] md:text-base font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-rose-600" /> ล็อตใกล้หมดอายุ (10 รายการแรก)
            </CardTitle>
            <Badge className="bg-rose-100 text-rose-700 border border-rose-200">
              FEFO <Info className="h-3.5 w-3.5 ml-1" />
            </Badge>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b border-slate-200">
                  <th className="py-2 pr-2 font-semibold">ล็อต</th>
                  <th className="py-2 pr-2 font-semibold">วัคซีน</th>
                  <th className="py-2 pr-2 font-semibold">หมดอายุ</th>
                  <th className="py-2 pr-2 text-right font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="text-slate-800">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-3 pr-2"><div className="h-4 w-28 bg-slate-200/70 rounded animate-pulse" /></td>
                      <td className="py-3 pr-2"><div className="h-4 w-44 bg-slate-200/70 rounded animate-pulse" /></td>
                      <td className="py-3 pr-2"><div className="h-4 w-24 bg-slate-200/70 rounded animate-pulse" /></td>
                      <td className="py-3 pr-2" />
                    </tr>
                  ))
                ) : filteredNearExpire.length === 0 ? (
                  <tr><td className="py-6 text-center text-slate-500" colSpan={4}><BadgeCheck className="inline h-4 w-4 mr-1" /> ไม่มีล็อตใกล้หมดอายุ</td></tr>
                ) : (
                  filteredNearExpire.map((item, idx) => (
                    <tr key={item.lotNo} className={cn('border-b border-slate-100 hover:bg-slate-50/60', idx % 2 === 0 && 'bg-slate-50/40')}>
                      <td className="py-2.5 pr-2 font-medium">{item.lotNo}</td>
                      <td className="py-2.5 pr-2">{item.vaccine?.name}</td>
                      <td className="py-2.5 pr-2">{new Date(item.expirationDate).toLocaleDateString()}</td>
                      <td className="py-2.5 pr-2 text-right">
                        <div className="inline-flex gap-2">
                          <Button asChild variant="outline" className="h-8 px-2 border-indigo-200 text-indigo-700">
                            <Link href={`/vaccination-records?lotNo=${encodeURIComponent(item.lotNo)}`}>ใช้/จอง</Link>
                          </Button>
                          <Button asChild variant="ghost" className="h-8 px-2 text-sky-700 hover:bg-sky-50">
                            <Link href={`/lots?search=${encodeURIComponent(item.lotNo)}`}>รายละเอียด</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="mt-3 flex justify-between text-sm text-slate-600">
              <div>รวมใกล้หมดอายุทั้งหมด: <span className="font-semibold">{fmt(nearExpireTotal)}</span> รายการ</div>
              <Button asChild variant="ghost" className="gap-1 text-slate-700 hover:bg-slate-50">
                <Link href="/lots">ดูทั้งหมด <ArrowRightCircle className="h-4 w-4" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ตาราง: การฉีดล่าสุด (8 รายการ) */}
        <Card className="bg-white border-0 ring-1 ring-slate-200 shadow-sm rounded-2xl xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-[15px] md:text-base font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-600" /> การฉีดล่าสุด
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b border-slate-200">
                  <th className="py-2 pr-2 font-semibold">ผู้รับวัคซีน</th>
                  <th className="py-2 pr-2 font-semibold">วัคซีน / ล็อต</th>
                  <th className="py-2 pr-2 font-semibold">วันที่</th>
                  <th className="py-2 pr-2 font-semibold">สถานะ</th>
                </tr>
              </thead>
              <tbody className="text-slate-800">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-3 pr-2"><div className="h-4 w-44 bg-slate-200/70 rounded animate-pulse" /></td>
                      <td className="py-3 pr-2"><div className="h-4 w-56 bg-slate-200/70 rounded animate-pulse" /></td>
                      <td className="py-3 pr-2"><div className="h-4 w-40 bg-slate-200/70 rounded animate-pulse" /></td>
                      <td className="py-3 pr-2"><div className="h-5 w-28 bg-slate-200/70 rounded-full animate-pulse" /></td>
                    </tr>
                  ))
                ) : recentVaccinations.length === 0 ? (
                  <tr><td className="py-6 text-center text-slate-500" colSpan={4}><PackageOpen className="inline h-4 w-4 mr-1" /> ไม่มีข้อมูล</td></tr>
                ) : (
                  recentVaccinations.map((r, idx) => (
                    <tr key={r.id} className={cn('border-b border-slate-100 hover:bg-slate-50/60', idx % 2 === 0 && 'bg-slate-50/40')}>
                      <td className="py-2.5 pr-2 font-medium">{r.patient?.fullName ?? '-'}</td>
                      <td className="py-2.5 pr-2">{r.vaccine?.name ?? '-'} <span className="text-slate-400">•</span> {r.lot?.lotNo ?? '-'}</td>
                      <td className="py-2.5 pr-2">{new Date(r.vaccinationDate).toLocaleString()}</td>
                      <td className="py-2.5 pr-2">
                        {r.status === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-xs ring-1 ring-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5" /> COMPLETED
                          </span>
                        )}
                        {r.status === 'POSTPONED' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs ring-1 ring-amber-200">
                            <CalendarDays className="h-3.5 w-3.5" /> POSTPONED
                          </span>
                        )}
                        {r.status === 'CANCELED' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 px-2.5 py-0.5 text-xs ring-1 ring-rose-200">
                            <AlertTriangle className="h-3.5 w-3.5" /> CANCELED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="mt-3 flex justify-end">
              <Button asChild variant="ghost" className="gap-1 text-slate-700 hover:bg-slate-50">
                <Link href="/vaccination-records">
                  ไปหน้าบันทึก/ประวัติ <ArrowRightCircle className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Bottom subtle glow */}
      <div className="pointer-events-none mx-auto mt-6 w-[80%] h-20 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(125,211,252,.35),transparent)] rounded-full" />

      {/* แถบลอยลัดสร้าง (ช่วยงานจริง) */}
      <div className="fixed right-5 bottom-5 flex flex-col gap-2">
        <Button asChild className="shadow-lg gap-2">
          <Link href="/vaccination-records"><Syringe className="h-4 w-4" /> บันทึกการฉีด</Link>
        </Button>
        <Button asChild variant="secondary" className="shadow-lg gap-2">
          <Link href="/lots"><PlusCircle className="h-4 w-4" /> เพิ่มล็อต/รับเข้า</Link>
        </Button>
      </div>
    </div>
  )
}
