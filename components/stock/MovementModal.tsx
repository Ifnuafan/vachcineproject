'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'

export type ActionType = 'RECEIVE' | 'TRANSFER' | 'ISSUE' | 'DISPOSE'

type Warehouse = { id: number; name: string; type: 'MAIN' | 'SUB'; note?: string | null }
type LotLite = {
  lotNo: string
  vaccineId: number
  expirationDate: string // ISO
  vaccine?: { id: number; name: string }
}

type Props = {
  open: boolean
  defaultAction?: ActionType
  onClose: () => void
  onSaved: () => void
  warehouses: Warehouse[]
  currentWarehouseId?: number
  /** ถ้ากดจากแถวในตาราง จะกรอก lotNo ให้ล่วงหน้า */
  prefillLotNo?: string
}

export default function MovementModal({
  open,
  defaultAction = 'TRANSFER',
  onClose,
  onSaved,
  warehouses,
  currentWarehouseId,
  prefillLotNo,
}: Props) {
  // form state
  const [action, setAction] = useState<ActionType>(defaultAction)
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [lotNo, setLotNo] = useState(prefillLotNo || '')
  const [quantity, setQuantity] = useState<number | ''>('')
  const [sourceWarehouseId, setSourceWarehouseId] = useState<number | ''>('')
  const [targetWarehouseId, setTargetWarehouseId] = useState<number | ''>('')
  const [remarks, setRemarks] = useState('')

  // สำหรับ RECEIVE (ถ้าล็อตยังไม่เคยมี ให้ส่งข้อมูลให้ API สร้างล็อตได้)
  const [recvVaccineId, setRecvVaccineId] = useState<number | ''>('')
  const [recvExpDate, setRecvExpDate] = useState<string>('')

  // lots autosuggest
  const [lotSearch, setLotSearch] = useState('')
  const [lotOptions, setLotOptions] = useState<LotLite[]>([])
  const [loadingLots, setLoadingLots] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // initial defaults
  useEffect(() => {
    if (!open) return
    setAction(defaultAction)
    setDate(new Date().toISOString().slice(0, 10))
    setLotNo(prefillLotNo || '')
    setQuantity('')
    setRemarks('')
    // ตั้งค่าคลังเริ่มต้น
    if (defaultAction === 'TRANSFER') {
      setSourceWarehouseId(currentWarehouseId ?? '')
      setTargetWarehouseId(
        currentWarehouseId
          ? warehouses.find(w => w.id !== currentWarehouseId)?.id ?? ''
          : ''
      )
    } else {
      // ISSUE/DISPOSE ใช้ target=คลังปัจจุบัน (รายการจะถูกนับออกจากคลังนี้)
      // RECEIVE ใช้ target=คลังปัจจุบัน (รับเข้าเข้าคลังนี้)
      setSourceWarehouseId('')
      setTargetWarehouseId(currentWarehouseId ?? '')
    }
    // reset receive extras
    setRecvVaccineId('')
    setRecvExpDate('')
    setLotSearch('')
    setLotOptions([])
    setSubmitError('')
  }, [open, defaultAction, prefillLotNo, currentWarehouseId, warehouses])

  // โหลดรายการล็อตสำหรับ autosuggest
  useEffect(() => {
    if (!open) return
    const q = (lotSearch || lotNo || '').trim()
    if (q === '') {
      setLotOptions([])
      return
    }
    let alive = true
    ;(async () => {
      setLoadingLots(true)
      try {
        const res = await fetch(`/api/lots?search=${encodeURIComponent(q)}&limit=10`, { cache: 'no-store' })
        const data = await res.json()
        if (!alive) return
        const items: LotLite[] = (data?.items ?? []).map((x: any) => ({
          lotNo: x.lotNo,
          vaccineId: x.vaccineId,
          expirationDate: x.expirationDate,
          vaccine: x.vaccine ? { id: x.vaccine.id, name: x.vaccine.name } : undefined,
        }))
        setLotOptions(items)
      } catch {
        /* ignore */
      } finally {
        if (alive) setLoadingLots(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [open, lotSearch, lotNo])

  // ตรวจสอบกดได้ไหม
  const canSubmit = useMemo(() => {
    if (!lotNo.trim()) return { ok: false, why: 'กรอกล็อตก่อน' }
    if (!quantity || Number(quantity) <= 0) return { ok: false, why: 'จำนวนต้องมากกว่า 0' }

    if (action === 'TRANSFER') {
      if (!sourceWarehouseId || !targetWarehouseId) return { ok: false, why: 'เลือกคลังต้นทาง/ปลายทางให้ครบ' }
      if (sourceWarehouseId === targetWarehouseId) return { ok: false, why: 'ต้นทางและปลายทางต้องแตกต่างกัน' }
      return { ok: true, why: '' }
    }

    // RECEIVE / ISSUE / DISPOSE ใช้ targetWarehouseId เป็นคลังที่กระทบ
    if (!targetWarehouseId) return { ok: false, why: 'เลือกคลัง' }

    if (action === 'RECEIVE') {
      // ถ้าล็อตยังไม่เคยมี ควรกรอก vaccineId และวันหมดอายุ เพื่อให้ API สร้างล็อต
      const lotKnown = lotOptions.some(o => o.lotNo.toLowerCase() === lotNo.trim().toLowerCase())
      if (!lotKnown) {
        if (!recvVaccineId || !recvExpDate) {
          return { ok: false, why: 'ล็อตใหม่: กรุณาเลือก Vaccine และกำหนดวันหมดอายุ' }
        }
      }
    }

    return { ok: true, why: '' }
  }, [action, lotNo, quantity, sourceWarehouseId, targetWarehouseId, recvVaccineId, recvExpDate, lotOptions])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit.ok || submitting) return
    setSubmitting(true)
    setSubmitError('')

    try {
      const payload: any = {
        action,
        lotNo: lotNo.trim(),
        quantity: Number(quantity),
        remarks: remarks.trim() || undefined,
        transactionDate: date, // API รองรับ
      }

      if (action === 'TRANSFER') {
        payload.sourceWarehouseId = Number(sourceWarehouseId)
        payload.targetWarehouseId = Number(targetWarehouseId)
      } else {
        payload.targetWarehouseId = Number(targetWarehouseId)
        // สำหรับ RECEIVE: เผื่อสร้างล็อตใหม่
        if (action === 'RECEIVE') {
          if (recvVaccineId) payload.vaccineId = Number(recvVaccineId)
          if (recvExpDate) payload.expirationDate = recvExpDate
        }
      }

      const res = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let msg = 'บันทึกไม่สำเร็จ'
        try {
          const j = await res.json()
          if (j?.message) msg = j.message
        } catch {}
        throw new Error(msg)
      }

      onSaved()
    } catch (err: any) {
      setSubmitError(err?.message || 'เกิดข้อผิดพลาด')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  // ui helpers
  const showSource = action === 'TRANSFER'
  const showTarget = true // ทุก action มีผลกับคลังเป้าหมาย
  const showRecvExtras = action === 'RECEIVE'

  // ใช้ Portal กันปัญหา z-index/stacking-context
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-xl shadow-2xl border bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold">ทำรายการสต็อก</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Action */}
            <div>
              <label className="block mb-1 text-sm font-medium">ประเภท</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as ActionType)}
                className="w-full px-3 py-2 border rounded-md bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
              >
                <option value="RECEIVE">RECEIVE (รับเข้า)</option>
                <option value="TRANSFER">TRANSFER (โอน)</option>
                <option value="ISSUE">ISSUE (เบิก)</option>
                <option value="DISPOSE">DISPOSE (ทำลาย)</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block mb-1 text-sm font-medium">วันที่ทำรายการ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
              />
            </div>

            {/* Lot (with autosuggest) */}
            <div className="md:col-span-2">
              <label className="block mb-1 text-sm font-medium">ล็อต (เลือกจากระบบ หรือพิมพ์รหัสมาน่ะ)</label>
              <input
                type="text"
                value={lotNo}
                onChange={(e) => {
                  setLotNo(e.target.value)
                  setLotSearch(e.target.value)
                }}
                placeholder="เช่น PF-001"
                className="w-full px-3 py-2 border rounded-md bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
              />
              {loadingLots && <div className="text-xs text-gray-500 mt-1">กำลังค้นหา...</div>}
              {!loadingLots && lotOptions.length > 0 && (
                <div className="mt-1 border rounded-md max-h-40 overflow-auto bg-white dark:bg-gray-800 dark:border-gray-700">
                  {lotOptions.map((o) => (
                    <button
                      type="button"
                      key={o.lotNo}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => {
                        setLotNo(o.lotNo)
                        setLotSearch(o.lotNo)
                        // เผื่อกรอกค่าอัตโนมัติสำหรับ RECEIVE
                        setRecvVaccineId(o.vaccineId)
                        setRecvExpDate(o.expirationDate?.slice(0,10))
                      }}
                    >
                      <div className="text-sm font-medium">{o.lotNo}</div>
                      <div className="text-xs text-gray-500">
                        {o.vaccine?.name ?? '-'} • หมดอายุ {new Date(o.expirationDate).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block mb-1 text-sm font-medium">จำนวน</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-md bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
              />
            </div>

            {/* Warehouses */}
            {showSource && (
              <div>
                <label className="block mb-1 text-sm font-medium">ต้นทาง</label>
                <select
                  value={sourceWarehouseId}
                  onChange={(e) => setSourceWarehouseId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border rounded-md bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                >
                  <option value="">-- เลือกคลังต้นทาง --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.type})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {showTarget && (
              <div>
                <label className="block mb-1 text-sm font-medium">
                  {action === 'TRANSFER' ? 'ปลายทาง' : 'คลัง'}
                </label>
                <select
                  value={targetWarehouseId}
                  onChange={(e) => setTargetWarehouseId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border rounded-md bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                >
                  <option value="">
                    {action === 'TRANSFER' ? '-- เลือกคลังปลายทาง --' : '-- เลือกคลัง --'}
                  </option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.type})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* RECEIVE extras (เผื่อสร้างล็อตใหม่) */}
            {showRecvExtras && (
              <>
                {/* <div>
                  <label className="block mb-1 text-sm font-medium">Vaccine ID (ถ้าล็อตใหม่)</label>
                  <input
                    type="number"
                    value={recvVaccineId}
                    onChange={(e) => setRecvVaccineId(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                    placeholder="เช่น 1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ถ้าล็อตนี้ยังไม่เคยมี ให้ใส่ Vaccine ID เพื่อให้ระบบสร้างล็อตให้
                  </p>
                </div> */}
                {/* <div>
                  <label className="block mb-1 text-sm font-medium">วันหมดอายุ (ถ้าล็อตใหม่)</label>
                  <input
                    type="date"
                    value={recvExpDate}
                    onChange={(e) => setRecvExpDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  />
                </div> */}
              </>
            )}

            {/* Remarks (full width) */}
            <div className="md:col-span-2">
              <label className="block mb-1 text-sm font-medium">หมายเหตุ</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
              />
            </div>

            {/* Errors */}
            {(!canSubmit.ok || submitError) && (
              <div className="md:col-span-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                {submitError || canSubmit.why}
              </div>
            )}

            {/* Actions */}
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border text-gray-700 dark:text-gray-200 dark:border-gray-600"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={!canSubmit.ok || submitting}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
              >
                {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  )
}
