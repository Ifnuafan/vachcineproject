'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import classNames from 'classnames'
import {
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  BeakerIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ArrowUpRightIcon,
} from '@heroicons/react/24/solid'

/* ============ Small UI helpers ============ */
function IconBadge({
  children,
  ring = true,
  size = 'md', // ✅ default เป็นค่าเดียว
}: {
  children: React.ReactNode
  ring?: boolean
  size?: 'sm' | 'md' | 'lg' // ✅ union type
}) {
  const sz =
    size === 'sm' ? 'h-8 w-8 text-[14px]' :
    size === 'lg' ? 'h-12 w-12 text-[18px]' :
    'h-10 w-10 text-[16px]'
  return (
    <span
      className={classNames(
        'inline-flex items-center justify-center rounded-xl text-white shadow-sm',
        'bg-gradient-to-tr from-sky-400 via-violet-400 to-pink-400',
        ring && 'ring-1 ring-violet-200/60',
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

/* ============ Types ============ */
type Cine = {
  id: number
  name: string
  type: string
  requiredDoses: number
  usageType: string
  createdAt: string
  updatedAt: string
}

/* ============ Page ============ */
export default function CinesPage() {
  const { data: session } = useSession()
  const role = session?.user?.role as string | undefined
  const canEdit = role === 'ADMIN'

  const [items, setItems] = useState<Cine[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // track row-deleting state
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchList = async () => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search.trim()) qs.set('search', search.trim())
      const res = await fetch(`/api/cines?${qs.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      setItems(json.items)
      setTotal(json.total)
    } catch (e: any) {
      setError(e?.message || 'โหลดข้อมูลล้มเหลว')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchList() }, [page])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit])

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editing, setEditing] = useState<Cine | null>(null)

  const openCreate = () => { setIsFormOpen(true); setEditing(null) }
  const openEdit = (it: Cine) => { setIsFormOpen(true); setEditing(it) }

  // ✅ ลบรายการวัคซีน
  const onDelete = async (id: number) => {
    if (!canEdit) return
    if (!confirm('ลบรายการวัคซีนนี้หรือไม่?')) return
    setDeletingId(id)
    setError('')
    try {
      const res = await fetch(`/api/cines/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const msg = await res.text().catch(() => '')
        throw new Error(msg || 'ลบไม่สำเร็จ')
      }
      // ลบออกจากรายการทันที + อัปเดตยอดรวม (เร็วขึ้น)
      setItems(prev => prev.filter(it => it.id !== id))
      setTotal(prev => Math.max(0, prev - 1))
      // หรือจะเรียก fetchList() เพื่อ sync กับ server ก็ได้
      // await fetchList()
    } catch (e: any) {
      setError(e?.message || 'ลบไม่สำเร็จ')
      // เผื่อรายการไม่ตรงกับ server ก็รีเฟรชหนึ่งรอบ
      await fetchList()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="relative min-h-screen px-4 py-8">
      {/* background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-50 via-sky-50 to-white" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <IconBadge size="lg"><BeakerIcon className="w-6 h-6" /></IconBadge>
            ตารางวัคซีน (Master)
          </h1>
          <RainbowChip label={`ทั้งหมด ${total.toLocaleString()} รายการ`} />
        </div>
        <div className="flex gap-2">
          <button onClick={fetchList}
            className="flex items-center gap-2 bg-white border px-4 py-2 rounded-md shadow-sm hover:bg-slate-50 text-slate-700">
            <ArrowPathIcon className="w-5 h-5 text-sky-500" /> รีเฟรช
          </button>
          <Link
            href="/lots"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-md text-slate-800 bg-white ring-1 ring-slate-200 shadow-sm hover:bg-sky-50"
          >
            <IconBadge size="sm"><ArrowUpRightIcon className="w-4.5 h-4.5" /></IconBadge>
            ไปหน้าล็อต
          </Link>
          {canEdit && (
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 hover:opacity-95">
              <PlusCircleIcon className="w-5 h-5" /> เพิ่มวัคซีน
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center border px-3 py-2 rounded-md bg-white border-slate-200">
          <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (setPage(1), fetchList())}
            placeholder="ค้นหาชื่อ/ประเภท/usageType"
            className="ml-2 w-full bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPage(1); fetchList() }}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-95"
          >
            <SparklesIcon className="w-5 h-5" /> ค้นหา
          </button>
        </div>
      </div>

      {/* Error/Loading */}
      {error && <div className="mt-3 mb-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{error}</div>}
      {loading && <div className="mb-4 text-slate-500">กำลังโหลด...</div>}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-xl shadow-md ring-1 ring-slate-200">
          <thead className="bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50 text-slate-700">
            <tr>
              <th className="px-4 py-2 text-center w-20">ลำดับ</th>
              <th className="px-4 py-2 text-left">ชื่อวัคซีน</th>
              <th className="px-4 py-2 text-left">ชนิดวัคซีน</th>
              <th className="px-4 py-2 text-center">จำนวนเข็ม</th>
              <th className="px-4 py-2 text-left">Usage</th>
              <th className="px-4 py-2 text-center">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-slate-50">
            {items.map((it, idx) => (
              <tr key={it.id}
                className="border-t border-slate-200/60 hover:bg-gradient-to-r hover:from-violet-50/70 hover:to-sky-50/70 transition-colors">
                <td className="px-4 py-2 text-center text-slate-700">{(page - 1) * limit + idx + 1}</td>
                <td className="px-4 py-2 font-medium text-slate-800 flex items-center gap-2">
                  <span className="text-xl">💉</span>
                  {it.name}
                  {it.requiredDoses >= 3 && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-violet-700 bg-violet-50 ring-1 ring-violet-200">
                      <ShieldCheckIcon className="w-3.5 h-3.5" /> High dose
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600">{it.type}</td>
                <td className="px-4 py-2 text-center">
                  <span className="px-2 py-1 text-sm rounded-full font-semibold bg-emerald-100 text-emerald-700">
                    {it.requiredDoses}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-600">{it.usageType}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-center gap-3">
                    {/* ไปหน้า /lots พร้อม prefillVaccineId */}
                   <Link
  href={{ pathname: '/lots/new', query: { prefillVaccineId: it.id } }}
  className="px-2.5 py-1.5 rounded-md text-white text-sm shadow-sm bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-95"
>
  นำเข้าล็อต
</Link>


                    {/* แก้ไข */}
                    <button
                      onClick={() => openEdit(it)}
                      disabled={!canEdit}
                      className={classNames(
                        'p-1.5 rounded-full hover:bg-emerald-50 text-emerald-600',
                        !canEdit && 'opacity-40 cursor-not-allowed'
                      )}
                      title="แก้ไข"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    {/* ลบ */}
                    <button
                      onClick={() => onDelete(it.id)}
                      disabled={!canEdit || deletingId === it.id}
                      className={classNames(
                        'p-1.5 rounded-full hover:bg-rose-50 text-rose-600',
                        (!canEdit || deletingId === it.id) && 'opacity-40 cursor-not-allowed'
                      )}
                      title={deletingId === it.id ? 'กำลังลบ...' : 'ลบ'}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-400">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="px-3 py-1 rounded-md bg-white ring-1 ring-slate-200 disabled:opacity-50 shadow-sm hover:bg-slate-50"
        >
          ก่อนหน้า
        </button>
        <span className="text-slate-700">หน้า {page} / {totalPages}</span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="px-3 py-1 rounded-md bg-white ring-1 ring-slate-200 disabled:opacity-50 shadow-sm hover:bg-slate-50"
        >
          ถัดไป
        </button>
      </div>

      {isFormOpen && (
        <VaccineForm
          initial={editing ?? undefined}
          onClose={() => setIsFormOpen(false)}
          onSaved={() => { setIsFormOpen(false); fetchList() }}
          canEdit={canEdit}
        />
      )}
    </div>
  )
}

/* ============ Auto rules for requiredDoses (No input needed by default) ============ */
// key ใช้ชื่อวัคซีน normalize (ไม่สนช่องว่าง/เคส)
const RECOMMENDED_DOSES: Record<string, number> = {
  // ตัวอย่างที่พบบ่อย (ไม่มี 'covid-19')
  'bcg': 1,
  'hepb': 3,
  'hepatitisb': 3,
  'dpt': 5,
  'dtp': 5,
  'mmr': 2,
  'varicella': 2,
  'polio': 4,
  'ipv': 4,
  'opv': 4,
  'pcv': 3,
  'hib': 3,
  'hpv': 2
}

// เผื่อบางชนิดวัคซีนอยากกำกับขั้นต่ำ
const TYPE_MIN: Record<string, number> = {
  'เชื้อเป็น': 1,
  'เชื้อตาย': 1
}

function normalizeName(s: string) {
  return s.toLowerCase().replace(/\s+/g, '').trim()
}

function autoRequiredDoses(name: string, type?: string): number {
  const key = normalizeName(name)
  if (RECOMMENDED_DOSES[key]) return RECOMMENDED_DOSES[key]
  if (type && TYPE_MIN[type] != null) return TYPE_MIN[type]
  return 1 // fallback
}

/* ============ Sub components (no default export) ============ */
function VaccineForm({
  initial,
  onClose,
  onSaved,
  canEdit,
}: {
  initial?: Partial<Cine>
  onClose: () => void
  onSaved: () => void
  canEdit: boolean
}) {
  const isEdit = Boolean(initial?.id)
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState(initial?.type ?? '')
  const [usageType, setUsageType] = useState(initial?.usageType ?? '')

  // --- AUTO & MANUAL (override) states ---
  // ค่าอัตโนมัติจากแมพ
  const [autoDoses, setAutoDoses] = useState<number>(
    autoRequiredDoses(initial?.name ?? '', initial?.type)
  )
  // ถ้าเป็นโหมดแก้ไขและมีค่าเดิม ให้ prefll เป็น manualInput; ถ้าไม่มีก็ใช้ auto
  const [manualInput, setManualInput] = useState<number>(
    typeof initial?.requiredDoses === 'number' ? initial!.requiredDoses : autoDoses
  )
  // เปิดโหมดปรับเองได้เฉพาะ ADMIN; default = false
  const [allowManual, setAllowManual] = useState<boolean>(false)

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // เมื่อชื่อ/ชนิดวัคซีนเปลี่ยน → คำนวณ auto ใหม่ (แต่จะไม่ทับ manual หาก allowManual = true)
  useEffect(() => {
    const a = autoRequiredDoses(name, type)
    setAutoDoses(a)
    if (!allowManual) {
      setManualInput(a) // sync ให้แสดงผลตรง badge จนกว่าจะเปิดปรับเอง
    }
  }, [name, type, allowManual])

  const effectiveRequired = allowManual ? manualInput : autoDoses

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!name || !type || !usageType) {
      setErr('กรุณากรอกข้อมูลให้ครบ')
      return
    }
    if (allowManual && (!manualInput || manualInput < 1)) {
      setErr('จำนวนเข็ม (ปรับเอง) ต้องมากกว่า 0')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name,
        type,
        requiredDoses: effectiveRequired,
        usageType
      }
      const res = await fetch(isEdit ? `/api/cines/${initial!.id}` : '/api/cines', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({ message: '' }))
        throw new Error(j.message || 'บันทึกไม่สำเร็จ')
      }
      onSaved()
    } catch (e: any) {
      setErr(e?.message || 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <IconBadge size="sm"><BeakerIcon className="w-4.5 h-4.5" /></IconBadge>
            {isEdit ? 'แก้ไขวัคซีน' : 'เพิ่มวัคซีนใหม่'}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {err && (
            <div className="mb-3 text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{err}</div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium text-slate-700">ชื่อวัคซีน</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border px-3 py-2 rounded-md bg-white border-slate-200 text-slate-800"
                placeholder="เช่น Pfizer, MMR, HepB"
              />
            </div>

            {/* ชนิดวัคซีน */}
            <div>
              <label className="block mb-1 text-sm font-medium text-slate-700">ชนิดวัคซีน</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border px-3 py-2 rounded-md bg-white border-slate-200 text-slate-800"
              >
                <option value="">-- เลือกชนิดวัคซีน --</option>
                <option value="เชื้อเป็น">เชื้อเป็น</option>
                <option value="เชื้อตาย">เชื้อตาย</option>
              </select>
            </div>

            {/* แสดงผลอัตโนมัติ + สวิตช์ปรับเอง (ADMIN เท่านั้น) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">จำนวนเข็มที่แนะนำสำหรับการสร้างภูมิคุ้มกันครบชุด</label>
                <label className={classNames(
                  'flex items-center gap-2 text-sm',
                  !canEdit && 'opacity-50 cursor-not-allowed'
                )}>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    disabled={!canEdit}
                    checked={allowManual}
                    onChange={(e) => setAllowManual(e.target.checked)}
                  />
                  <span>ปรับเอง (ADMIN)</span>
                </label>
              </div>

              {!allowManual ? (
                <>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-sm font-semibold">
                    {autoDoses} เข็ม
                  </div>
                  <p className="text-xs text-slate-500">ระบบคำนวณอัตโนมัติจากชื่อ/ชนิดวัคซีน</p>
                </>
              ) : (
                <div>
                  <input
                    type="number"
                    min={1}
                    value={manualInput}
                    onChange={(e) => setManualInput(Math.max(1, Number(e.target.value || 1)))}
                    className="w-full border px-3 py-2 rounded-md bg-white border-slate-200 text-slate-800"
                    placeholder="กรอกจำนวนเข็ม"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    ค่าปัจจุบัน (อัตโนมัติ): {autoDoses} เข็ม • ระบบจะบันทึกค่านี้แทน
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-slate-700">Usage Type</label>
              <select
                value={usageType}
                onChange={(e) => setUsageType(e.target.value)}
                className="w-full border px-3 py-2 rounded-md bg-white border-slate-200 text-slate-800"
              >
                <option value="">-- เลือกประเภทการใช้ --</option>
                <option value="1:1">1 ต่อ 1</option>
                <option value="1:10">1 ต่อ 10</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md bg-white ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 disabled:opacity-60"
              >
                บันทึก
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
