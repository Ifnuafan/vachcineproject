'use client'

import { useEffect, useMemo, useState } from 'react'
import classNames from 'classnames'
import * as XLSX from 'xlsx'
import Link from 'next/link'
import {
  MagnifyingGlassIcon,
  RectangleStackIcon,
  ArrowPathIcon,
  BuildingStorefrontIcon,
  Squares2X2Icon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import {
  BeakerIcon,
  ChartBarIcon,
} from '@heroicons/react/24/solid'

/* ========= Types ========= */
type Warehouse = { id: number; name: string; type: 'MAIN' | 'SUB'; note?: string | null }
type Row = {
  id: string                // 👈 แก้จาก number เป็น string ให้ตรงกับ API
  warehouseId: number
  vaccineId: number | null
  lotNo: string
  dosesTotal: number
  dosesUsed: number
  openedAt: string
  expiresAt: string
  status: 'OPEN' | 'EXPIRED'
  vaccine?: { id: number; name: string } | null
}

/* ========= Small UI helpers ========= */
function IconBadge({
  children,
  ring = true,
  size = 'md',
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
        'bg-gradient-to-tr from-sky-400 via-violet-400 to-pink-400',
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
      <span className="h-2 w-2 rounded-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-400" />
      {label}
    </span>
  )
}

/* ========= Utils ========= */
const fmtDateTime = (iso?: string | null) => {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString() } catch { return iso || '-' }
}
const msLeft = (iso?: string | null) => {
  if (!iso) return 0
  return new Date(iso).getTime() - Date.now()
}
const timeLeftText = (ms: number) => {
  if (ms <= 0) return 'หมดเวลาแล้ว'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}ชม ${m}น`
}
const leftBadge = (ms: number) => {
  if (ms <= 0) return 'bg-rose-50 text-rose-700 ring-rose-200'
  if (ms <= 60 * 60 * 1000) return 'bg-rose-50 text-rose-700 ring-rose-200'
  if (ms <= 4 * 60 * 60 * 1000) return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
}

/* ========= Page ========= */
export default function OpenVialsPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehouseId, setWarehouseId] = useState<number | ''>('')
  const [vaccineId, setVaccineId] = useState<number | ''>('') // (เผื่ออนาคต filter ตาม id)
  const [status, setStatus] = useState<'OPEN' | 'EXPIRED' | 'ALL'>('OPEN')
  const [q, setQ] = useState('')

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ----- load warehouses: SUB ก่อน -----
  const loadWarehouses = async () => {
    try {
      const res = await fetch('/api/warehouses?limit=200', { cache: 'no-store' })
      const data = await res.json()
      const items: Warehouse[] = (data.items ?? []) as Warehouse[]
      const sorted = items.slice().sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name)
        return a.type === 'SUB' ? -1 : 1
      })
      setWarehouses(sorted)
      if (!warehouseId && sorted.length > 0) {
        const sub = sorted.find(w => w.type === 'SUB')
        setWarehouseId(sub?.id ?? sorted[0].id)
      }
    } catch (e) {
      console.error(e)
    }
  }
  useEffect(() => { loadWarehouses() }, [])

  // ----- load open vials -----
  const load = async () => {
    if (!warehouseId) return
    setLoading(true)
    setError('')
    try {
      const sp = new URLSearchParams()
      sp.set('warehouseId', String(warehouseId))
      if (vaccineId) sp.set('vaccineId', String(vaccineId))
      if (status !== 'ALL') sp.set('status', status)
      sp.set('limit', '500')

      const res = await fetch(`/api/open-vials?${sp.toString()}`, { cache: 'no-store' })
      const text = await res.text()
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้ กรุณาเข้าสู่ระบบด้วยบัญชีที่ถูกต้อง')
          setRows([])
          return
        }
        try {
          const j = JSON.parse(text)
          throw new Error(j?.message || 'โหลดข้อมูลไม่สำเร็จ')
        } catch {
          throw new Error(text?.slice(0, 200) || 'โหลดข้อมูลไม่สำเร็จ')
        }
      }
      let data: any
      try { data = JSON.parse(text) } catch { throw new Error('API /open-vials คืนข้อมูลไม่ใช่ JSON') }
      const items: Row[] = data?.items ?? data ?? []
      setRows(items)
    } catch (e: any) {
      setError(e?.message || 'เกิดข้อผิดพลาด')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  // load เมื่อเปลี่ยน filter
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, status, vaccineId])

  // ⏱ auto refresh ทุก 30 วิ
  useEffect(() => {
    if (!warehouseId) return
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, status, vaccineId])

  // ----- client filter: lotNo / vaccine name -----
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter(r => {
      const name = (r.vaccine?.name ?? '').toLowerCase()
      return r.lotNo.toLowerCase().includes(t) || name.includes(t)
    })
  }, [rows, q])

  // ----- small stats -----
  const totalOpen = filtered.filter(r => r.status === 'OPEN').length
  const totalRemain = filtered.reduce((sum, r) => sum + Math.max(0, r.dosesTotal - r.dosesUsed), 0)

  // ----- export -----
  const handleExportExcel = () => {
    const data = filtered.map(r => {
      const remain = Math.max(0, r.dosesTotal - r.dosesUsed)
      const ms = msLeft(r.expiresAt)
      const timeText = timeLeftText(ms)
      return {
        คลัง: r.warehouseId,
        วัคซีน: r.vaccine?.name ?? '-',
        ล็อต: r.lotNo,
        ใช้ไปแล้ว_โดส: r.dosesUsed,
        ทั้งหมด_โดส: r.dosesTotal,
        คงเหลือ_โดส: remain,
        เปิดเมื่อ: fmtDateTime(r.openedAt),
        หมดเวลา: fmtDateTime(r.expiresAt),
        สถานะ: r.status,
        เวลา_คงเหลือ: timeText,
      }
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'OpenVials')
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    XLSX.writeFile(wb, `open-vials-${stamp}.xlsx`)
  }

  return (
    <div className="relative min-h-screen px-4 py-8">
      {/* Pastel background with extra violet */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-50 via-sky-50 to-white" />
        <div className="absolute -top-28 -right-28 w-96 h-96 rounded-full bg-fuchsia-200/30 blur-3xl" />
        <div className="absolute -bottom-28 -left-28 w-[28rem] h-[28rem] rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <IconBadge size="lg"><BeakerIcon className="w-6 h-6" /></IconBadge>
            ขวดที่เปิดค้าง (ใช้งานได้ 8 ชั่วโมง)
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95"
            title="ไปหน้า Dashboard"
          >
            <Squares2X2Icon className="w-5 h-5" />
            Dashboard
          </Link>
          <Link
            href="/stock"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm bg-gradient-to-r from-fuchsia-600 to-sky-600 hover:opacity-95"
            title="ไปหน้าคลังวัคซีน"
          >
            <BuildingStorefrontIcon className="w-5 h-5" />
            Stock
          </Link>
          <button
            onClick={load}
            className="flex items-center gap-2 bg-white border px-4 py-2 rounded-md shadow-sm hover:bg-slate-50 text-slate-700"
            title="รีเฟรช"
          >
            <ArrowPathIcon className="w-5 h-5 text-sky-500" />
            รีเฟรช
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm bg-gradient-to-r from-violet-500 via-fuchsia-500 to-sky-500 hover:opacity-95"
          >
            <ChartBarIcon className="w-5 h-5" />
            ส่งออก Excel
          </button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <RainbowChip label={`เปิดใช้อยู่ ${totalOpen} ขวด`} />
        <RainbowChip label={`คงเหลือรวม ${totalRemain.toLocaleString()} โดส`} />
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ring-1 bg-white ring-slate-200">
          ทั้งหมด {filtered.length.toLocaleString()} รายการ
        </span>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">
          เปิดใช้อยู่ {filtered.filter(r => r.status==='OPEN').length}
        </span>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ring-1 bg-rose-50 text-rose-700 ring-rose-200">
          หมดเวลา {filtered.filter(r => r.status==='EXPIRED').length}
        </span>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2 border rounded-md bg-white border-slate-200 text-slate-800"
          title="เลือกคลัง"
        >
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.type})
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="px-3 py-2 border rounded-md bg-white border-slate-200 text-slate-800"
        >
          <option value="OPEN">เฉพาะที่ยังใช้ได้</option>
          <option value="EXPIRED">แสดงเฉพาะที่หมดเวลา</option>
          <option value="ALL">ทั้งหมด</option>
        </select>

        {/* ฟิลเตอร์แบบค้นหาข้อความ (lot/vaccine name) */}
        <div className="sm:col-span-2 flex items-center border px-3 py-2 rounded-md bg-white border-slate-200">
          <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหา lot หรือชื่อวัคซีน"
            className="ml-2 w-full bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* ปุ่มลัด “ดูในคลัง” รวมทั้งหน้า */}
        <div className="flex">
          <Link
            href={`/stock?warehouseId=${warehouseId || ''}&q=${encodeURIComponent(q)}${q ? `&focusLot=${encodeURIComponent(q)}` : ''}`}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-md text-slate-700 ring-1 ring-slate-200 bg-white hover:bg-slate-50"
            title="เปิดหน้า Stock พร้อมตัวกรองนี้"
          >
            <BuildingStorefrontIcon className="w-5 h-5" />
            เปิดดูในคลัง (ตามตัวกรอง)
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-xl shadow-md ring-1 ring-slate-200">
          <thead className="bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50 text-slate-700">
            <tr>
              <th className="px-4 py-2 text-left">วัคซีน</th>
              <th className="px-4 py-2 text-left">ล็อต</th>
              <th className="px-4 py-2 text-center">ใช้ไป/ทั้งหมด</th>
              <th className="px-4 py-2 text-center">คงเหลือ</th>
              <th className="px-4 py-2 text-center">เปิดเมื่อ</th>
              <th className="px-4 py-2 text-center">หมดเวลา</th>
              <th className="px-4 py-2 text-center">สถานะ</th>
              <th className="px-4 py-2 text-center">ลิงก์</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-slate-50">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  กำลังโหลด...
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((r) => {
                const remain = Math.max(0, r.dosesTotal - r.dosesUsed)
                const ms = msLeft(r.expiresAt)
                return (
                  <tr
                    key={`${r.warehouseId}-${r.lotNo}`}
                    className={classNames(
                      'border-t border-slate-200/60 transition-colors',
                      ms <= 0
                        ? 'bg-rose-50/60 hover:bg-rose-50'
                        : 'hover:bg-gradient-to-r hover:from-violet-50/70 hover:to-sky-50/70'
                    )}
                  >
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {r.vaccine?.name ?? '-'}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {r.lotNo}
                    </td>
                    <td className="px-4 py-2 text-center text-slate-700">
                      {r.dosesUsed.toLocaleString()} / {r.dosesTotal.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={classNames(
                        'px-2 py-1 text-sm rounded-full font-semibold',
                        remain <= 0 ? 'bg-rose-100 text-rose-700' :
                        remain < 5 ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      )}>
                        {remain.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center text-slate-600">
                      {fmtDateTime(r.openedAt)}
                    </td>
                    <td className="px-4 py-2 text-center text-slate-600">
                      {fmtDateTime(r.expiresAt)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={classNames(
                        'px-2 py-1 text-xs rounded-full ring-1',
                        r.status === 'OPEN'
                          ? leftBadge(ms)
                          : 'bg-rose-50 text-rose-700 ring-rose-200'
                      )}>
                        {r.status === 'OPEN' ? `คงเหลือ ${timeLeftText(ms)}` : 'หมดเวลาแล้ว'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Link
                        href={`/stock?warehouseId=${r.warehouseId}&q=${encodeURIComponent(r.lotNo)}&focusLot=${encodeURIComponent(r.lotNo)}`}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-slate-700"
                        title="เปิดดูรายการนี้ในหน้า Stock"
                      >
                        <BuildingStorefrontIcon className="w-4 h-4" />
                        ดูในคลัง
                      </Link>
                    </td>
                  </tr>
                )
              })}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-6 text-slate-400">
                  ไม่พบรายการ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer tips / error */}
      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <div className="bg-white border border-slate-200 p-4 rounded-md text-sm text-slate-600">
          <div className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <IconBadge size="sm"><RectangleStackIcon className="w-4 h-4" /></IconBadge>
            วิธีนับเวลา 8 ชั่วโมง
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>ระบบถือเวลา <b>openedAt</b> เป็นจุดเริ่ม</li>
            <li><b>expiresAt = openedAt + 8 ชั่วโมง</b></li>
            <li>จะถูกจัดกลุ่มเป็น <b>OPEN</b> หรือ <b>EXPIRED</b> ตามเวลาปัจจุบัน</li>
          </ul>
          <div className="mt-2 text-xs text-slate-500">
            * ถ้าขวดเปิดค้างหลายขวด ระบบบันทึกการฉีดจะเลือกขวดที่ใกล้หมดเวลาก่อน (ลดของเหลือทิ้ง)
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-md text-sm text-rose-700">
            {error}
          </div>
        )}
      </div>

      {/* Tiny nav helper */}
      <div className="mt-4 text-sm text-slate-600 flex items-center gap-2">
        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
        <span>ต้องการดูสต็อกภาพรวม? ไปที่&nbsp;</span>
        <Link href="/stock" className="text-violet-700 hover:underline">/stock</Link>
      </div>
    </div>
  )
}
