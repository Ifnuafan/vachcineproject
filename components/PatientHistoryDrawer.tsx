'use client'

import { useEffect, useMemo, useState } from 'react'
import classNames from 'classnames'
import { XMarkIcon, ClockIcon } from '@heroicons/react/24/outline'

type LotStatus = 'USABLE'|'NEAR_EXPIRE'|'EXPIRED'
type VStatus = 'COMPLETED'|'POSTPONED'|'CANCELED'
type Patient = { id:number; fullName:string; cid:string; birthDate:string; gender:'MALE'|'FEMALE'|'OTHER' }
type RecordItem = {
  id:number; vaccinationDate:string; doseNumber:number|null; injectionSite:string|null;
  status:VStatus; provider:string|null; remarks:string|null; lotNo:string;
  vaccine?:{ id:number; name:string }; lot?:{ lotNo:string; expirationDate:string|null; status:LotStatus }
}

const STATUS_BADGE: Record<VStatus,string> = {
  COMPLETED:'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  POSTPONED:'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  CANCELED:'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
}
const STATUS_THAI: Record<VStatus,string> = { COMPLETED:'สำเร็จ', POSTPONED:'เลื่อน', CANCELED:'ยกเลิก' }
const LOT_BADGE = {
  USABLE:'bg-violet-100 text-violet-700 ring-1 ring-violet-200',
  NEAR_EXPIRE:'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  EXPIRED:'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
} as const
const LOT_THAI = { USABLE:'พร้อมใช้', NEAR_EXPIRE:'ใกล้หมดอายุ', EXPIRED:'หมดอายุ' } as const

const fmt = (d?:string|null) => {
  const x = d ? new Date(d) : null
  return x && !isNaN(x.getTime()) ? x.toLocaleString('th-TH', { dateStyle:'medium', timeStyle:'short' }) : '-'
}
const fmtD = (d?:string|null) => {
  const x = d ? new Date(d) : null
  return x && !isNaN(x.getTime()) ? x.toLocaleDateString('th-TH', { dateStyle:'medium' }) : '-'
}

export default function PatientHistoryDrawer({
  open, patientId, onClose,
}: {
  open: boolean
  patientId: number | null
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [records, setRecords] = useState<RecordItem[]>([])
  const [q, setQ] = useState('')
  const [vaccineId, setVaccineId] = useState<number|''>('')

  useEffect(() => {
    if (!open || !patientId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/patients/${patientId}`, { cache: 'no-store' }).then(r=>r.json()),
      fetch(`/api/vaccination-records?patientId=${patientId}&limit=500`, { cache: 'no-store' }).then(r=>r.json()),
    ]).then(([p, rec]) => {
      setPatient(p ?? null)
      setRecords(Array.isArray(rec?.items) ? rec.items : [])
    }).finally(() => setLoading(false))
  }, [open, patientId])

  const vaccines = useMemo(() => {
    const m = new Map<number,string>()
    records.forEach(r => r.vaccine?.id && m.set(r.vaccine.id, r.vaccine.name))
    return Array.from(m, ([id,name]) => ({id,name}))
  }, [records])

  const filtered = useMemo(() => {
    let list = [...records]
    if (vaccineId) list = list.filter(r => r.vaccine?.id === Number(vaccineId))
    if (q.trim()) {
      const s = q.trim().toLowerCase()
      list = list.filter(r =>
        r.lotNo.toLowerCase().includes(s) ||
        (r.provider||'').toLowerCase().includes(s) ||
        (r.remarks||'').toLowerCase().includes(s)
      )
    }
    return list.sort((a,b)=> new Date(b.vaccinationDate).getTime() - new Date(a.vaccinationDate).getTime())
  }, [records, vaccineId, q])

  return (
    <>
      {/* overlay */}
      <div
        className={classNames(
          'fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      {/* drawer */}
      <aside
        className={classNames(
          'fixed top-0 right-0 h-full w-full max-w-3xl z-50 bg-white shadow-2xl ring-1 ring-slate-200 transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50">
          <div className="font-semibold text-slate-800">
            ประวัติผู้ป่วย {patient ? `— ${patient.fullName} (${patient.cid})` : ''}
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-100" aria-label="ปิด">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* body */}
        <div className="h-[calc(100%-56px)] overflow-y-auto p-4 space-y-4">
          {/* profile */}
          <div className="rounded-xl p-4 bg-white ring-1 ring-slate-200">
            {patient ? (
              <div className="text-sm text-slate-700 grid grid-cols-2 gap-2">
                <div><span className="text-slate-500">ชื่อ-สกุล:</span> {patient.fullName}</div>
                <div><span className="text-slate-500">CID:</span> {patient.cid}</div>
                <div className="col-span-2"><span className="text-slate-500">วันเกิด:</span> {fmtD(patient.birthDate)}</div>
              </div>
            ) : (
              <div className="text-slate-500">กำลังโหลดข้อมูล…</div>
            )}
          </div>

          {/* filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white ring-1 ring-slate-200 rounded-md px-3 py-2">
              <label className="text-sm text-slate-600">วัคซีน</label>
              <select value={vaccineId} onChange={e=>setVaccineId(Number(e.target.value)||'')} className="w-full bg-transparent focus:outline-none">
                <option value="">ทั้งหมด</option>
                {vaccines.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="bg-white ring-1 ring-slate-200 rounded-md px-3 py-2 md:col-span-2">
              <label className="text-sm text-slate-600">ค้นหา (ล็อต/ผู้ให้บริการ/หมายเหตุ)</label>
              <input value={q} onChange={e=>setQ(e.target.value)} className="w-full bg-transparent focus:outline-none" />
            </div>
          </div>

          {/* list */}
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500"><ClockIcon className="w-5 h-5 animate-spin" /> กำลังโหลด…</div>
          ) : filtered.length === 0 ? (
            <div className="text-slate-500">ไม่มีรายการ</div>
          ) : (
            <ul className="space-y-3">
              {filtered.map(r => (
                <li key={r.id} className="rounded-lg p-3 bg-white ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-800">{fmt(r.vaccinationDate)}</div>
                    <span className={classNames('px-2 py-0.5 rounded-full text-xs font-semibold', STATUS_BADGE[r.status])}>
                      {STATUS_THAI[r.status]}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-700">
                    <div><span className="text-slate-500">วัคซีน:</span> {r.vaccine?.name ?? '-'}</div>
                    <div><span className="text-slate-500">เข็มที่:</span> {r.doseNumber ?? '-'}</div>
                    <div><span className="text-slate-500">ตำแหน่งฉีด:</span> {r.injectionSite ?? '-'}</div>
                    <div className="md:col-span-2 flex items-center gap-2">
                      <span className="text-slate-500">ล็อต:</span> {r.lotNo}
                      {r.lot?.status && (
                        <span className={classNames('px-1.5 py-0.5 rounded-full text-[11px] font-medium', LOT_BADGE[r.lot.status as LotStatus])}>
                          {LOT_THAI[r.lot.status as LotStatus]}
                        </span>
                      )}
                    </div>
                    <div><span className="text-slate-500">หมดอายุ:</span> {r.lot?.expirationDate ? fmtD(r.lot.expirationDate) : '-'}</div>
                    <div><span className="text-slate-500">ผู้ให้บริการ:</span> {r.provider ?? '-'}</div>
                    {r.remarks && <div className="md:col-span-3"><span className="text-slate-500">หมายเหตุ:</span> {r.remarks}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}
