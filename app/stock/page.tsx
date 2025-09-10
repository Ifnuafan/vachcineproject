'use client'

import { useEffect, useMemo, useState } from 'react'
import classNames from 'classnames'
import * as XLSX from 'xlsx'
import {
  PlusCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  ArrowsRightLeftIcon,
  TrashIcon,
  ArrowDownOnSquareIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import {
  SparklesIcon,
  BeakerIcon,
  ChartBarIcon,
  ArrowUpRightIcon,
} from '@heroicons/react/24/solid'
import MovementModal, { ActionType } from '@/components/stock/MovementModal'

type Warehouse = { id: number; name: string; type: 'MAIN' | 'SUB'; note?: string | null }
type StockRow = {
  warehouseId: number
  lotNo: string
  quantity: number
  vaccineId: number | null
  vaccineName: string | null
  expirationDate: string | null
}

/** ───────────── Utils ───────────── */
const today0 = () => {
  const t = new Date()
  return new Date(t.getFullYear(), t.getMonth(), t.getDate())
}
const isExpired = (iso?: string | null) => {
  if (!iso) return false
  const d = new Date(iso)
  const D = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return D.getTime() < today0().getTime()
}
const daysLeft = (iso?: string | null) => {
  if (!iso) return 0
  const d = new Date(iso)
  const D = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.ceil((D.getTime() - today0().getTime()) / 86400000)
}
const getStatusColor = (q: number) =>
  q < 10
    ? 'bg-rose-100 text-rose-700'
    : q < 50
    ? 'bg-amber-100 text-amber-700'
    : 'bg-emerald-100 text-emerald-700'
const getExpireBadge = (iso?: string | null) => {
  const d = daysLeft(iso)
  if (d < 0) return 'bg-rose-100 text-rose-700'
  if (d <= 30) return 'bg-amber-100 text-amber-700'
  return 'bg-violet-100 text-violet-700'
}
const fmtDate = (iso?: string | null) => {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString()
  } catch {
    return iso || '-'
  }
}
function getVaccineEmoji(name?: string | null) {
  const brand = (name || '').toLowerCase()
  if (brand.includes('pfizer')) return '💉'
  if (brand.includes('astra')) return '🧪'
  if (brand.includes('moderna')) return '🔬'
  if (brand.includes('sinovac') || brand.includes('coronavac')) return '🌡️'
  return '🧫'
}

/** ───────────── UI helpers (สีม่วง+彩虹) ───────────── */
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
        // ไล่สีฟ้า→ม่วง→ชมพู (พาสเทล)
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

export default function VaccineStockPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehouseId, setWarehouseId] = useState<number | ''>('')
  const [stocks, setStocks] = useState<StockRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [filterBrand, setFilterBrand] = useState('')
  const [filterExpiry, setFilterExpiry] = useState<'ทั้งหมด' | 'ใกล้หมดอายุ' | 'หมดอายุแล้ว'>('ทั้งหมด')

  const [modalOpen, setModalOpen] = useState(false)
  const [action, setAction] = useState<ActionType>('RECEIVE')
  const [prefillLotNo, setPrefillLotNo] = useState<string | undefined>(undefined)

  // โหลดคลัง + สต็อก
  const loadWarehouses = async () => {
    try {
      const res = await fetch('/api/warehouses', { cache: 'no-store' })
      const data = await res.json()
      const items: Warehouse[] = data.items ?? []
      setWarehouses(items)
      if (!warehouseId && items.length > 0) setWarehouseId(items[0].id)
    } catch (e) {
      console.error(e)
    }
  }
  const loadInventory = async () => {
    if (!warehouseId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/inventory?warehouseId=${warehouseId}`, { cache: 'no-store' })
      if (!res.ok) throw new Error((await res.json()).message || 'โหลดข้อมูลไม่สำเร็จ')
      const data: StockRow[] = await res.json()
      setStocks(data)
    } catch (e: any) {
      setError(e?.message || 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    loadWarehouses()
  }, [])
  useEffect(() => {
    loadInventory()
  }, [warehouseId])

  // ฟิลเตอร์
  const filtered = useMemo(() => {
    const brand = filterBrand.trim().toLowerCase()
    return stocks.filter((s) => {
      const left = daysLeft(s.expirationDate)
      const passBrand =
        brand === '' ||
        (s.vaccineName ?? '').toLowerCase().includes(brand) ||
        s.lotNo.toLowerCase().includes(brand)
      const passExpiry =
        filterExpiry === 'ทั้งหมด' ||
        (filterExpiry === 'ใกล้หมดอายุ' && left >= 0 && left <= 30) ||
        (filterExpiry === 'หมดอายุแล้ว' && left < 0)
      return passBrand && passExpiry
    })
  }, [stocks, filterBrand, filterExpiry])

  const total = filtered.reduce((sum, s) => sum + (s.quantity || 0), 0)
  const nearlyExpired = filtered.filter((s) => {
    const d = daysLeft(s.expirationDate)
    return d >= 0 && d <= 30
  })
  const expiredList = filtered.filter((s) => isExpired(s.expirationDate))
  const lowStock = filtered.filter((s) => (s.quantity || 0) < 10)

  // Modal
  const openModal = (act: ActionType, lotNo?: string) => {
    setAction(act)
    setPrefillLotNo(lotNo)
    setModalOpen(true)
  }

  // ยังคง logic เดิมของ dispose / export
  const disposeOne = async (row: StockRow) => {
    if (!warehouseId) return
    if (!isExpired(row.expirationDate)) return
    try {
      const res = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DISPOSE',
          lotNo: row.lotNo,
          quantity: Math.max(1, row.quantity),
          targetWarehouseId: Number(warehouseId),
          remarks: 'Dispose expired (one row)',
        }),
      })
      if (!res.ok) {
        const m = await res.json().catch(() => ({}))
        throw new Error(m?.message || 'ล้มเหลว')
      }
      await loadInventory()
    } catch (e) {
      console.error(e)
      alert('ทำลายไม่สำเร็จ')
    }
  }

  const disposeAllExpired = async () => {
    if (!warehouseId) return
    const candidates = filtered.filter((r) => isExpired(r.expirationDate) && r.quantity > 0)
    if (candidates.length === 0) return
    if (!confirm(`ยืนยันทำลายวัคซีนหมดอายุทั้งหมด ${candidates.length} รายการ?`)) return
    try {
      for (const r of candidates) {
        await fetch('/api/movements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'DISPOSE',
            lotNo: r.lotNo,
            quantity: r.quantity,
            targetWarehouseId: Number(warehouseId),
            remarks: 'Dispose expired (bulk)',
          }),
        })
      }
      await loadInventory()
      alert('ทำลายเสร็จแล้ว')
    } catch (e) {
      console.error(e)
      alert('ทำลายบางรายการไม่สำเร็จ กรุณาตรวจสอบ')
    }
  }

  const handleExportExcel = () => {
    const data = filtered.map((s) => {
      const d = daysLeft(s.expirationDate)
      let expiryStatus = 'ปกติ'
      if (d < 0) expiryStatus = 'หมดอายุแล้ว'
      else if (d <= 30) expiryStatus = 'ใกล้หมดอายุ'
      return {
        วัคซีน: s.vaccineName ?? '-',
        ล็อต: s.lotNo,
        จำนวน: s.quantity,
        วันหมดอายุ: fmtDate(s.expirationDate),
        อายุคงเหลือ_วัน: d,
        สถานะอายุ: expiryStatus,
        คลัง: warehouses.find((w) => w.id === s.warehouseId)?.name ?? s.warehouseId,
      }
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory')
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    XLSX.writeFile(wb, `inventory-${stamp}.xlsx`)
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <IconBadge size="lg"><BeakerIcon className="w-6 h-6" /></IconBadge>
            คลังวัคซีน
          </h1>
          <RainbowChip label={`รวมทั้งหมด ${total.toLocaleString()} โดส`} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadInventory}
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

      {/* Action bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <a href="/lots">
          <button className="flex items-center gap-2 px-4 py-2 rounded-md text-slate-800 bg-white ring-1 ring-slate-200 shadow-sm hover:bg-sky-50">
            <IconBadge size="sm"><PlusCircleIcon className="w-4.5 h-4.5" /></IconBadge>
            Lots
          </button>
        </a>

        <div
          className={classNames(
            'flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm',
            nearlyExpired.length > 0 ? 'bg-amber-500' : 'bg-slate-400'
          )}
          title="รายการใกล้หมดอายุ (≤30 วัน)"
        >
          <ExclamationTriangleIcon className="w-5 h-5" />
          ใกล้หมดอายุ {nearlyExpired.length}
        </div>

        <button
          onClick={disposeAllExpired}
          className={classNames(
            'flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm',
            expiredList.length > 0 ? 'bg-rose-500 hover:bg-rose-600' : 'bg-slate-400 cursor-not-allowed'
          )}
          disabled={expiredList.length === 0}
        >
          <TrashIcon className="w-5 h-5" />
          ทำลายหมดอายุ ({expiredList.length})
        </button>

        <button
          onClick={() => openModal('RECEIVE')}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-slate-800 bg-white ring-1 ring-emerald-200 shadow-sm hover:bg-emerald-50"
        >
          <IconBadge size="sm"><ArrowDownOnSquareIcon className="w-4.5 h-4.5" /></IconBadge>
          รับเข้า
        </button>
        <button
          onClick={() => openModal('ISSUE')}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-slate-800 bg-white ring-1 ring-indigo-200 shadow-sm hover:bg-indigo-50"
        >
          <IconBadge size="sm"><ArrowUpRightIcon className="w-4.5 h-4.5" /></IconBadge>
          เบิก
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2 border rounded-md bg-white border-slate-200 text-slate-800"
        >
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.type})
            </option>
          ))}
        </select>

        <div className="flex items-center border px-3 py-2 rounded-md bg-white border-slate-200">
          <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาด้วยชื่อวัคซีน/ล็อต"
            className="ml-2 w-full bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
          />
        </div>

        <select
          value={filterExpiry}
          onChange={(e) => setFilterExpiry(e.target.value as any)}
          className="px-3 py-2 border rounded-md bg-white border-slate-200 text-slate-800"
        >
          <option value="ทั้งหมด">อายุทั้งหมด</option>
          <option value="ใกล้หมดอายุ">ใกล้หมดอายุ (≤30วัน)</option>
          <option value="หมดอายุแล้ว">หมดอายุแล้ว</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-xl shadow-md ring-1 ring-slate-200">
          <thead className="bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50 text-slate-700">
            <tr>
              <th className="px-4 py-2 text-left">วัคซีน</th>
              <th className="px-4 py-2 text-left">ล็อต</th>
              <th className="px-4 py-2 text-center">จำนวน</th>
              <th className="px-4 py-2 text-center">วันหมดอายุ</th>
              <th className="px-4 py-2 text-center">อายุคงเหลือ</th>
              <th className="px-4 py-2 text-center">คลัง</th>
              <th className="px-4 py-2 text-center">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-slate-50">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  กำลังโหลด...
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((s, idx) => (
                <tr
                  key={`${s.lotNo}-${idx}`}
                  className="border-t border-slate-200/60 hover:bg-gradient-to-r hover:from-violet-50/70 hover:to-sky-50/70 transition-colors"
                >
                  <td className="px-4 py-2 flex items-center gap-2 font-medium text-slate-800">
                    <span className="text-xl">{getVaccineEmoji(s.vaccineName)}</span>
                    {s.vaccineName ?? '-'}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{s.lotNo}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={classNames('px-2 py-1 text-sm rounded-full font-semibold', getStatusColor(s.quantity || 0))}>
                      {(s.quantity || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={classNames('px-2 py-1 text-sm rounded-full', getExpireBadge(s.expirationDate))}>
                      {fmtDate(s.expirationDate)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center text-slate-600">{daysLeft(s.expirationDate)} วัน</td>
                  <td className="px-4 py-2 text-center text-slate-600">
                    {warehouses.find((w) => w.id === s.warehouseId)?.name ?? s.warehouseId}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-center gap-3">
                      <button
                        className="text-sky-600 hover:text-sky-800"
                        onClick={() => openModal('TRANSFER', s.lotNo)}
                        disabled={(s.quantity || 0) <= 0}
                        title="โอนวัคซีน"
                      >
                        <ArrowsRightLeftIcon className="w-5 h-5" />
                      </button>
                      <button className="text-emerald-600 hover:text-emerald-800" title="แก้ไข">
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        className={classNames(
                          isExpired(s.expirationDate) ? 'text-rose-600 hover:text-rose-700' : 'text-slate-300 cursor-not-allowed'
                        )}
                        onClick={() => disposeOne(s)}
                        disabled={!isExpired(s.expirationDate) || (s.quantity || 0) <= 0}
                        title={isExpired(s.expirationDate) ? 'ทำลายวัคซีนหมดอายุชุดนี้' : 'ยังไม่หมดอายุ'}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-slate-400">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <MovementModal
        open={modalOpen}
        defaultAction={action}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false)
          loadInventory()
        }}
        warehouses={warehouses}
        currentWarehouseId={typeof warehouseId === 'number' ? warehouseId : undefined}
        prefillLotNo={prefillLotNo}
      />

      {/* Alerts */}
      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        {nearlyExpired.length > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-300 p-4 rounded-md">
            <p className="text-amber-700 font-semibold">🕒 วัคซีนใกล้หมดอายุ {nearlyExpired.length} รายการ</p>
          </div>
        )}
        {lowStock.length > 0 && (
          <div className="bg-rose-50 border-l-4 border-rose-300 p-4 rounded-md">
            <p className="text-rose-700 font-semibold">📉 วัคซีนใกล้หมดสต็อก {lowStock.length} รายการ</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
    </div>
  )
}
