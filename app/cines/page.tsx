'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { CubeIcon, BeakerIcon } from '@heroicons/react/24/solid'
import classNames from 'classnames'

type Cine = {
  id: number
  name: string
  type: string
  requiredDoses: number
  usageType: string
  createdAt: string
  updatedAt: string
}

export default function CinesPage() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const canEdit = role === 'ADMIN'

  const [items, setItems] = useState<Cine[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editing, setEditing] = useState<Cine | null>(null)

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

  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit])

  const openCreate = () => {
    setEditing(null)
    setIsFormOpen(true)
  }

  const openEdit = (it: Cine) => {
    setEditing(it)
    setIsFormOpen(true)
  }

  const onSaved = () => {
    // ใช้กรณีแก้ไขอย่างเดียว (ตอนสร้างใหม่จะ redirect ในฟอร์มอยู่แล้ว)
    setIsFormOpen(false)
    fetchList()
  }

  const onDelete = async (id: number) => {
    if (!canEdit) return
    if (!confirm('ลบรายการนี้หรือไม่?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/cines/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      await fetchList()
    } catch (e: any) {
      alert(e?.message || 'ลบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BeakerIcon className="w-7 h-7 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ตารางวัคซีน (Master)</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchList}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
          >
            <ArrowPathIcon className="w-5 h-5" />
            รีเฟรช
          </button>

          <Link
            href="/lots"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 shadow-md"
          >
            <CubeIcon className="w-5 h-5" />
            ดูล็อตวัคซีน
          </Link>

          {canEdit && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            >
              <PlusCircleIcon className="w-5 h-5" />
              เพิ่มวัคซีน
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex items-center border px-3 py-2 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 w-full sm:w-96">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchList())}
            placeholder="ค้นหาชื่อ/ประเภท/usageType"
            className="ml-2 w-full bg-transparent focus:outline-none dark:text-white"
          />
        </div>
        <button
          onClick={() => { setPage(1); fetchList() }}
          className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          ค้นหา
        </button>
      </div>

      {/* Error/Loading */}
      {error && <div className="mb-4 text-red-600 bg-red-100 px-3 py-2 rounded">{error}</div>}
      {loading && <div className="mb-4 text-gray-600 dark:text-gray-300">กำลังโหลด...</div>}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow">
          <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
            <tr>
              <th className="px-4 py-2 text-center w-20">ลำดับ</th>
              <th className="px-4 py-2 text-left">ชื่อวัคซีน</th>
              <th className="px-4 py-2 text-left">ชนิดวัคซีน</th>
              <th className="px-4 py-2 text-center">จำนวนเข็ม</th>
              <th className="px-4 py-2 text-left">Usage</th>
              <th className="px-4 py-2 text-center">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr
                key={it.id}
                className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <td className="px-4 py-2 text-center text-gray-700 dark:text-gray-200">
                  {(page - 1) * limit + idx + 1}
                </td>
                <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{it.name}</td>
                <td className="px-4 py-2 text-gray-700 dark:text-gray-200">{it.type}</td>
                <td className="px-4 py-2 text-center">
                  <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    {it.requiredDoses}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-700 dark:text-gray-200">{it.usageType}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-center gap-2">
                    {/* นำเข้าล็อต */}
                    <Link
                      href={`/lots?vaccineId=${it.id}`}
                      className="px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
                    >
                      นำเข้าล็อต
                    </Link>

                    {/* แก้ไข */}
                    <button
                      onClick={() => openEdit(it)}
                      disabled={!canEdit}
                      className={classNames(
                        'p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-800 text-green-600 dark:text-green-400',
                        !canEdit && 'opacity-40 cursor-not-allowed'
                      )}
                      title="แก้ไข"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>

                    {/* ลบ */}
                    <button
                      onClick={() => onDelete(it.id)}
                      disabled={!canEdit}
                      className={classNames(
                        'p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-800 text-red-600 dark:text-red-400',
                        !canEdit && 'opacity-40 cursor-not-allowed'
                      )}
                      title="ลบ"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-400">
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
          className="px-3 py-1 rounded border bg-white dark:bg-gray-800 dark:border-gray-700 disabled:opacity-50"
        >
          ก่อนหน้า
        </button>
        <span className="text-gray-700 dark:text-gray-200">หน้า {page} / {totalPages}</span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="px-3 py-1 rounded border bg-white dark:bg-gray-800 dark:border-gray-700 disabled:opacity-50"
        >
          ถัดไป
        </button>
      </div>

      {isFormOpen && (
        <VaccineForm
          initial={editing ?? undefined}
          onClose={() => setIsFormOpen(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}

function VaccineForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Partial<Cine>
  onClose: () => void
  onSaved: () => void
}) {
  const router = useRouter()
  const isEdit = Boolean(initial?.id)
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState(initial?.type ?? '')
  const [requiredDoses, setRequiredDoses] = useState<number | ''>(initial?.requiredDoses ?? '')
  const [usageType, setUsageType] = useState(initial?.usageType ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!name || !type || !requiredDoses || !usageType) {
      setErr('กรุณากรอกข้อมูลให้ครบ')
      return
    }
    setSaving(true)
    try {
      const payload = { name, type, requiredDoses: Number(requiredDoses), usageType }
      const res = await fetch(isEdit ? `/api/cines/${initial!.id}` : '/api/cines', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({ message: '' }))
        throw new Error(j.message || 'บันทึกไม่สำเร็จ')
      }

      // ✅ บันทึกสำเร็จ → ไปหน้าล็อตทันที
      onClose()
      router.push('/lots')
      // ถ้าต้องการส่งต่อ vaccineId เพื่อพรีฟิลในหน้า lots:
      // const saved = await res.json()
      // router.push(`/lots?vaccineId=${saved.id}`)

      // กรณีเป็นแก้ไข เราอาจเรียก onSaved() เพื่อรีเฟรชลิสต์เมื่อกลับมาหน้านี้
      onSaved()
    } catch (e: any) {
      setErr(e?.message || 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            {isEdit ? 'แก้ไขวัคซีน' : 'เพิ่มวัคซีนใหม่'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {err && <div className="mb-3 text-red-600 bg-red-100 px-3 py-2 rounded">{err}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">ชื่อวัคซีน</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
              placeholder="เช่น Pfizer"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">ชนิดวัคซีน</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
            >
              <option value="">-- เลือกชนิดวัคซีน --</option>
              <option value="เชื้อเป็น">เชื้อเป็น (Live attenuated)</option>
              <option value="เชื้อตาย">เชื้อตาย (Inactivated)</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">จำนวนเข็มที่ต้องฉีด</label>
            <input
              type="number"
              min={1}
              value={requiredDoses}
              onChange={(e) => setRequiredDoses(Number(e.target.value))}
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">Usage Type</label>
            <select
              value={usageType}
              onChange={(e) => setUsageType(e.target.value)}
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
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
              className="px-4 py-2 rounded-lg border text-gray-700 dark:text-gray-200 dark:border-gray-600"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
