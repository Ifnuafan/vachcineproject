'use client'

import { useEffect, useMemo, useState } from 'react'
import LotForm, { VaccineLot as LotFromForm } from '@/components/lots/LotForm'
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ArrowDownOnSquareIcon,
  CubeIcon,
  PlusIcon,
  BuildingStorefrontIcon, // ← เพิ่มบรรทัดนี้
} from '@heroicons/react/24/outline'
import { FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

// สำหรับปุ่ม "นำเข้าคลัง"
import MovementModal, { ActionType } from '@/components/stock/MovementModal'

type LotStatus = 'USABLE' | 'NEAR_EXPIRE' | 'EXPIRED' | 'DESTROYED'

type VaccineLotDTO = {
  lotNo: string
  vaccineId: number
  expirationDate: string
  status: LotStatus
  quantity?: number
  vaccine?: { id: number; name: string }
}

type VaccineLotUI = {
  id: string
  lotNumber: string
  brand: string
  expirationDate: string
  quantity: number
  status: LotStatus
  vaccineId?: number
}

type Warehouse = { id: number; name: string; type: 'MAIN' | 'SUB'; note?: string | null }

const STATUS_THAI: Record<LotStatus, string> = {
  USABLE: 'ใช้งานได้',
  NEAR_EXPIRE: 'ใกล้หมดอายุ',
  EXPIRED: 'หมดอายุแล้ว',
  DESTROYED: 'ทำลายทิ้ง',
}

const STATUS_COLOR: Record<LotStatus, string> = {
  USABLE: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  NEAR_EXPIRE: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  EXPIRED: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
  DESTROYED: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
}

function formatDate(d?: string) {
  if (!d) return '-'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear())
  return `${dd}/${mm}/${yy}`
}

function norm(s: unknown) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\s+/g, ' ')
    .trim()
}

/** ───────────── UI helpers (ม่วงพาสเทล + 彩虹) ───────────── */
function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm bg-gradient-to-tr from-sky-400 via-violet-400 to-pink-400 ring-1 ring-violet-200/60"
      style={{ backdropFilter: 'saturate(140%) blur(0.5px)' }}
    >
      {children}
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

function mapDtoToUI(x: VaccineLotDTO): VaccineLotUI {
  return {
    id: x.lotNo,
    lotNumber: x.lotNo,
    brand: x.vaccine?.name ?? '-',
    expirationDate: x.expirationDate,
    quantity: x.quantity ?? 0,
    status: x.status,
    vaccineId: x.vaccineId,
  }
}

export default function VaccineLotsPage() {
  const [lots, setLots] = useState<VaccineLotUI[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ทั้งหมด' | LotStatus>('ทั้งหมด')

  // Warehouses สำหรับ MovementModal
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [mmOpen, setMmOpen] = useState(false)
  const [mmAction, setMmAction] = useState<ActionType>('RECEIVE')
  const [mmPrefillLotNo, setMmPrefillLotNo] = useState<string | undefined>(undefined)

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editLot, setEditLot] = useState<VaccineLotUI | null>(null)
  const [editForm, setEditForm] = useState({
    expirationDate: '',
    batchNumber: '',
    serialNumber: '',
    vaccineId: '' as number | '',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState<string | null>(null)

  // toggle form
  const [showForm, setShowForm] = useState(true)

  const fetchLots = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/lots?page=1&limit=100', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const items: VaccineLotDTO[] = Array.isArray(data) ? data : (data?.items ?? [])
      setLots(items.map(mapDtoToUI))
    } catch (e: any) {
      setError(e?.message || 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/warehouses', { cache: 'no-store' })
      const data = await res.json()
      setWarehouses(data?.items ?? [])
    } catch {}
  }

  useEffect(() => {
    fetchLots()
    fetchWarehouses()
  }, [])

  const handleAddFromForm = (lot: LotFromForm) => {
    const toUI: VaccineLotUI = {
      id: lot.id ?? lot.lotNumber,
      lotNumber: lot.lotNumber,
      brand: lot.brand,
      expirationDate: lot.expirationDate,
      quantity: lot.quantity ?? 0,
      status: (['USABLE', 'NEAR_EXPIRE', 'EXPIRED', 'DESTROYED'] as LotStatus[]).includes(
        lot.status as LotStatus
      )
        ? (lot.status as LotStatus)
        : 'USABLE',
    }
    setLots(prev => [toUI, ...prev])
  }

  // Edit handlers
  const openEdit = async (lot: VaccineLotUI) => {
    try {
      const res = await fetch(`/api/lots/${encodeURIComponent(lot.lotNumber)}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('โหลดรายละเอียดไม่สำเร็จ')
      const detail = await res.json()
      setEditLot(lot)
      setEditForm({
        expirationDate: detail?.expirationDate?.slice(0, 10) || lot.expirationDate.slice(0, 10),
        batchNumber: detail?.batchNumber ?? '',
        serialNumber: detail?.serialNumber ?? '',
        vaccineId: detail?.vaccineId ?? lot.vaccineId ?? '',
      })
      setEditOpen(true)
    } catch (e: any) {
      setError(e?.message || 'โหลดรายละเอียดไม่สำเร็จ')
    }
  }

  const submitEdit = async () => {
    if (!editLot) return
    setSavingEdit(true)
    try {
      const payload: any = {
        expirationDate: editForm.expirationDate,
        batchNumber: editForm.batchNumber || null,
        serialNumber: editForm.serialNumber || null,
      }
      if (editForm.vaccineId) payload.vaccineId = Number(editForm.vaccineId)

      const res = await fetch(`/api/lots/${encodeURIComponent(editLot.lotNumber)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      setEditOpen(false)
      setEditLot(null)
      await fetchLots()
    } catch (e: any) {
      setError(e?.message || 'แก้ไขไม่สำเร็จ')
    } finally {
      setSavingEdit(false)
    }
  }

  const removeLot = async (lot: VaccineLotUI) => {
    const ok = window.confirm(`ยืนยันลบล็อต: ${lot.lotNumber}?`)
    if (!ok) return
    setDeleteBusy(lot.lotNumber)
    try {
      const res = await fetch(`/api/lots/${encodeURIComponent(lot.lotNumber)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      setLots(prev => prev.filter(x => x.lotNumber !== lot.lotNumber))
      await fetchLots()
    } catch (e: any) {
      setError(e?.message || 'ลบไม่สำเร็จ')
    } finally {
      setDeleteBusy(null)
    }
  }

  const filteredLots = useMemo(() => {
    const q = norm(search)
    const terms = q ? q.split(' ') : []
    return lots.filter((lot) => {
      const hay = norm(
        [
          lot.lotNumber,
          lot.brand,
          formatDate(lot.expirationDate),
          lot.expirationDate,
          STATUS_THAI[lot.status],
          lot.status,
          (lot.quantity ?? 0).toString(),
        ].join(' ')
      )
      const matchSearch = terms.length === 0 || terms.every((t) => hay.includes(t))
      const matchStatus = filterStatus === 'ทั้งหมด' || lot.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [lots, search, filterStatus])

  // Export Excel
  const handleExportExcel = () => {
    const data = filteredLots.map((lot) => ({
      ลำดับ: lots.findIndex(l => l.id === lot.id) + 1,
      Lot: lot.lotNumber,
      ยี่ห้อ: lot.brand,
      หมดอายุ: formatDate(lot.expirationDate),
      จำนวน: lot.quantity ?? 0,
      สถานะ: STATUS_THAI[lot.status],
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'VaccineLots')
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    XLSX.writeFile(wb, `vaccine-lots-${stamp}.xlsx`)
  }

  // MovementModal RECEIVE
  const openReceiveForLot = (lotNo: string) => {
    setMmAction('RECEIVE')
    setMmPrefillLotNo(lotNo)
    setMmOpen(true)
  }

  return (
    <div className="relative min-h-screen px-4 py-8">
      {/* pastel background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-50 via-sky-50 to-white" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-fuchsia-200/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <IconBadge><CubeIcon className="w-6 h-6" /></IconBadge>
            จัดการล็อตวัคซีน
          </h1>
          <RainbowChip label={`ทั้งหมด ${filteredLots.length}/${lots.length} รายการ`} />
        </div>

        <div className="flex gap-2">
  <a
    href="/stock"  // ← เปลี่ยนเส้นทางได้ตาม route ของคุณ
    className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow hover:opacity-95"
    title="ไปหน้า Stock"
  >
    <BuildingStorefrontIcon className="w-5 h-5" />
    ไปหน้า Stock
  </a>

    {/* <a
    href="/dashboard"  // ← เปลี่ยนเส้นทางได้ตาม route ของคุณ
    className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow hover:opacity-95"
    title="ไปหน้า Dashboard"
  >
    <BuildingStorefrontIcon className="w-5 h-5" />
    ไปหน้า Dashboard
  </a> */}

  <button
    onClick={() => setShowForm(s => !s)}
    className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 shadow hover:opacity-95"
    title="แสดง/ซ่อนฟอร์มเพิ่มล็อต"
  >
    <PlusIcon className="w-5 h-5" />
    {showForm ? 'ซ่อนฟอร์ม' : 'เพิ่มล็อตใหม่'}
  </button>

  <button
    onClick={handleExportExcel}
    className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow hover:opacity-90"
    title="ส่งออกรายการที่กรองอยู่เป็นไฟล์ Excel"
  >
    <FileSpreadsheet className="w-5 h-5" />
    ส่งออก Excel
  </button>
</div>

      </div>

      {/* ฟอร์มเพิ่มล็อต (บนสุด / พับได้) */}
      {showForm && (
        <div className="mb-6">
          {/* ฟอร์มใช้โหมดหน้าเดียว */}
          <LotForm mode="single" onAdd={handleAddFromForm} onSaved={fetchLots} />
        </div>
      )}

      {/* ค้นหา + filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="พิมพ์ค้นหา: ยี่ห้อ / Lot / วันที่ (เช่น 01/09/2025) / สถานะ"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-9 py-2 border rounded-md bg-white border-slate-200 text-slate-800 shadow-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                title="ล้างการค้นหา"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border rounded-md bg-white border-slate-200 text-slate-800 shadow-sm"
          >
            <option value="ทั้งหมด">-- สถานะทั้งหมด --</option>
            <option value="USABLE">{STATUS_THAI.USABLE}</option>
            <option value="NEAR_EXPIRE">{STATUS_THAI.NEAR_EXPIRE}</option>
            <option value="EXPIRED">{STATUS_THAI.EXPIRED}</option>
            <option value="DESTROYED">{STATUS_THAI.DESTROYED}</option>
          </select>
        </div>
      </div>

      {loading && <div className="mb-3 text-sm text-slate-500">กำลังโหลดข้อมูล…</div>}
      {error && <div className="mb-3 text-sm text-rose-600">เกิดข้อผิดพลาด: {error}</div>}

      {/* ตาราง */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-xl shadow-md ring-1 ring-slate-200">
          <thead className="bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50 text-slate-700">
            <tr>
              <th className="px-4 py-2 text-center w-16">ลำดับ</th>
              <th className="px-4 py-2 text-left">Lot</th>
              <th className="px-4 py-2 text-left">ยี่ห้อ</th>
              <th className="px-4 py-2 text-left">หมดอายุ</th>
              <th className="px-4 py-2 text-left">สถานะ</th>
              <th className="px-4 py-2 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-slate-50">
            {filteredLots.map((lot, idx) => (
              <tr
                key={lot.id}
                className="border-t border-slate-200/60 hover:bg-gradient-to-r hover:from-violet-50/70 hover:to-sky-50/70 transition-colors"
              >
                <td className="px-4 py-2 text-center text-slate-700">{idx + 1}</td>
                <td className="px-4 py-2 font-medium text-slate-800">{lot.lotNumber}</td>
                <td className="px-4 py-2 text-slate-700">{lot.brand}</td>
                <td className="px-4 py-2 text-slate-700">{formatDate(lot.expirationDate)}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 text-xs rounded-full font-semibold ${STATUS_COLOR[lot.status]}`}>
                    {STATUS_THAI[lot.status]}
                  </span>
                </td>
                <td className="px-4 py-2 text-center space-x-2">
                  <button
                    onClick={() => openReceiveForLot(lot.lotNumber)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm shadow-sm"
                    title="นำวัคซีนล็อตนี้เข้าคลัง (RECEIVE)"
                  >
                    <ArrowDownOnSquareIcon className="w-4 h-4" />
                    นำเข้าคลัง
                  </button>
                  <button
                    onClick={() => openEdit(lot)}
                    className="inline-flex items-center justify-center rounded-full p-1.5 text-amber-600 hover:bg-amber-50"
                    title="แก้ไข"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => removeLot(lot)}
                    className={`inline-flex items-center justify-center rounded-full p-1.5 hover:bg-rose-50 ${
                      deleteBusy === lot.lotNumber ? 'text-rose-300' : 'text-rose-600'
                    }`}
                    title="ลบ"
                    disabled={deleteBusy === lot.lotNumber}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filteredLots.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-slate-400">
                  ไม่มีล็อตวัคซีนที่ตรงกับเงื่อนไข
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal (inline) */}
      {editOpen && editLot && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-xl rounded-xl shadow-xl p-6 ring-1 ring-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                แก้ไขล็อต: {editLot.lotNumber}
              </h3>
              <button onClick={() => setEditOpen(false)} className="text-slate-500 hover:text-slate-700">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">วันหมดอายุ</label>
                <input
                  type="date"
                  value={editForm.expirationDate}
                  onChange={(e) => setEditForm((s) => ({ ...s, expirationDate: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md bg-white border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">Vaccine ID (เปลี่ยนได้ถ้าจำเป็น)</label>
                <input
                  type="number"
                  value={editForm.vaccineId}
                  onChange={(e) =>
                    setEditForm((s) => ({ ...s, vaccineId: e.target.value ? Number(e.target.value) : '' }))
                  }
                  placeholder={String(editLot.vaccineId ?? '')}
                  className="w-full px-3 py-2 border rounded-md bg-white border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">Batch Number</label>
                <input
                  type="text"
                  value={editForm.batchNumber}
                  onChange={(e) => setEditForm((s) => ({ ...s, batchNumber: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md bg-white border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">Serial Number</label>
                <input
                  type="text"
                  value={editForm.serialNumber}
                  onChange={(e) => setEditForm((s) => ({ ...s, serialNumber: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md bg-white border-slate-200 text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 rounded-lg border text-slate-700 border-slate-200 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={submitEdit}
                disabled={savingEdit}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-violet-600 text-white shadow disabled:opacity-60"
              >
                {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MovementModal สำหรับ "นำเข้าคลัง" */}
      <MovementModal
        open={mmOpen}
        defaultAction={mmAction}
        onClose={() => setMmOpen(false)}
        onSaved={() => {
          setMmOpen(false)
          fetchLots()
        }}
        warehouses={warehouses}
        prefillLotNo={mmPrefillLotNo}
      />
    </div>
  )
}
