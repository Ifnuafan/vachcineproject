
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ArrowDownOnSquareIcon,
  CubeIcon,
  PlusIcon,
  BuildingStorefrontIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import MovementModal, { ActionType } from '@/components/stock/MovementModal';

type LotStatus = 'USABLE' | 'NEAR_EXPIRE' | 'EXPIRED' | 'DESTROYED';

type VaccineLotDTO = {
  lotNo: string;
  vaccineId: number;
  expirationDate: string;
  status: LotStatus;
  quantity?: number;
  batchNumber?: string | null;
  serialNumber?: string | null;
  vaccine?: { id: number; name: string; type?: string; usageType?: string };
};

type VaccineLotUI = {
  id: string;
  lotNumber: string;
  brand: string;
  expirationDate: string;
  quantity: number;
  status: LotStatus;
  vaccineId?: number;
};

type Warehouse = { id: number; name: string; type: 'MAIN' | 'SUB'; note?: string | null };

const STATUS_THAI: Record<LotStatus, string> = {
  USABLE: 'ใช้งานได้',
  NEAR_EXPIRE: 'ใกล้หมดอายุ',
  EXPIRED: 'หมดอายุแล้ว',
  DESTROYED: 'ทำลายทิ้ง',
};

// 🔔 ทำ NEAR_EXPIRE ให้เด่นขึ้น
const STATUS_COLOR: Record<LotStatus, string> = {
  USABLE: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  NEAR_EXPIRE:
    'bg-amber-200/80 text-amber-900 ring-2 ring-amber-300 font-bold shadow-[0_0_0_4px_rgba(251,191,36,0.18)]',
  EXPIRED: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200',
  DESTROYED: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
};

const NEAR_EXPIRE_DAYS = 60;

function dateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function computeStatus(expirationISO: string): LotStatus {
  const exp = new Date(expirationISO);
  const today = dateOnly(new Date());
  const expOnly = dateOnly(exp);
  const diffDays = Math.ceil((expOnly.getTime() - today.getTime()) / 86400000);
  if (diffDays <= 0) return 'EXPIRED';
  if (diffDays <= NEAR_EXPIRE_DAYS) return 'NEAR_EXPIRE';
  return 'USABLE';
}

function daysLeft(expirationISO: string) {
  const exp = dateOnly(new Date(expirationISO));
  const today = dateOnly(new Date());
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000);
}

function formatDate(d?: string) {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear());
  return `${dd}/${mm}/${yy}`;
}

function norm(s: unknown) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\s+/g, ' ')
    .trim();
}

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm bg-gradient-to-tr from-sky-400 via-violet-400 to-pink-400 ring-1 ring-violet-200/60"
      style={{ backdropFilter: 'saturate(140%) blur(0.5px)' }}
    >
      {children}
    </span>
  );
}

function RainbowChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-700 bg-white shadow-sm ring-1 ring-slate-200">
      <span className="h-2 w-2 rounded-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-400" />
      {label}
    </span>
  );
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
  };
}

export default function VaccineLotsPage() {
  const [lots, setLots] = useState<VaccineLotUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ทั้งหมด' | LotStatus>('ทั้งหมด');

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [mmOpen, setMmOpen] = useState(false);
  const [mmAction, setMmAction] = useState<ActionType>('RECEIVE');
  const [mmPrefillLotNo, setMmPrefillLotNo] = useState<string | undefined>(undefined);

  const [editOpen, setEditOpen] = useState(false);
  const [editLot, setEditLot] = useState<VaccineLotUI | null>(null);
  const [editForm, setEditForm] = useState({
    expirationDate: '',
    batchNumber: '',
    serialNumber: '',
    vaccineId: '' as number | '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState<string | null>(null);

  // รายละเอียด
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<VaccineLotDTO | null>(null);

  const openDetail = async (lotNo: string) => {
    try {
      const res = await fetch(`/api/lots/${encodeURIComponent(lotNo)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('โหลดรายละเอียดไม่สำเร็จ');
      const detail: VaccineLotDTO = await res.json();
      setDetailData(detail);
      setDetailOpen(true);
    } catch (e: any) {
      setError(e?.message || 'โหลดรายละเอียดไม่สำเร็จ');
    }
  };

  // โหลดรายการล็อต
  const fetchLots = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/lots?page=1&limit=100', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items: VaccineLotDTO[] = Array.isArray(data) ? data : (data?.items ?? []);
      setLots(items.map(mapDtoToUI));
    } catch (e: any) {
      setError(e?.message || 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  // โหลดคลัง
  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/warehouses', { cache: 'no-store' });
      const data = await res.json();
      setWarehouses(data?.items ?? []);
    } catch {}
  };

  useEffect(() => {
    fetchLots();
    fetchWarehouses();
  }, []);

  // แก้ไข
  const openEdit = async (lot: VaccineLotUI) => {
    try {
      const res = await fetch(`/api/lots/${encodeURIComponent(lot.lotNumber)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('โหลดรายละเอียดไม่สำเร็จ');
      const detail = await res.json();
      setEditLot(lot);
      setEditForm({
        expirationDate: detail?.expirationDate?.slice(0, 10) || lot.expirationDate.slice(0, 10),
        batchNumber: detail?.batchNumber ?? '',
        serialNumber: detail?.serialNumber ?? '',
        vaccineId: detail?.vaccineId ?? lot.vaccineId ?? '',
      });
      setEditOpen(true);
    } catch (e: any) {
      setError(e?.message || 'โหลดรายละเอียดไม่สำเร็จ');
    }
  };

  const submitEdit = async () => {
    if (!editLot) return;
    setSavingEdit(true);
    try {
      const payload: any = {
        expirationDate: editForm.expirationDate,
        batchNumber: editForm.batchNumber || null,
        serialNumber: editForm.serialNumber || null,
      };
      if (editForm.vaccineId) payload.vaccineId = Number(editForm.vaccineId);

      const res = await fetch(`/api/lots/${encodeURIComponent(editLot.lotNumber)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditOpen(false);
      setEditLot(null);
      await fetchLots();
    } catch (e: any) {
      setError(e?.message || 'แก้ไขไม่สำเร็จ');
    } finally {
      setSavingEdit(false);
    }
  };

  // ลบ
  const removeLot = async (lot: VaccineLotUI) => {
    const ok = window.confirm(`ยืนยันลบล็อต: ${lot.lotNumber}?`);
    if (!ok) return;
    setDeleteBusy(lot.lotNumber);
    try {
      const res = await fetch(`/api/lots/${encodeURIComponent(lot.lotNumber)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      setLots(prev => prev.filter(x => x.lotNumber !== lot.lotNumber));
      await fetchLots();
    } catch (e: any) {
      setError(e?.message || 'ลบไม่สำเร็จ');
    } finally {
      setDeleteBusy(null);
    }
  };

  // Filter + ค้นหา
  const filteredLots = useMemo(() => {
    const q = norm(search);
    const terms = q ? q.split(' ') : [];
    return lots.filter((lot) => {
      const liveStatus = computeStatus(lot.expirationDate);
      const hay = norm(
        [
          lot.lotNumber,
          lot.brand,
          formatDate(lot.expirationDate),
          lot.expirationDate,
          STATUS_THAI[liveStatus],
          liveStatus,
          (lot.quantity ?? 0).toString(),
        ].join(' ')
      );
      const matchSearch = terms.length === 0 || terms.every((t) => hay.includes(t));
      const matchStatus = filterStatus === 'ทั้งหมด' || liveStatus === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [lots, search, filterStatus]);

  // Export Excel
  const handleExportExcel = () => {
    const data = filteredLots.map((lot, i) => {
      const liveStatus = computeStatus(lot.expirationDate);
      return {
        ลำดับ: i + 1,
        Lot: lot.lotNumber,
        ยี่ห้อ: lot.brand,
        หมดอายุ: formatDate(lot.expirationDate),
        จำนวน: lot.quantity ?? 0,
        สถานะ: STATUS_THAI[liveStatus],
        'เหลือ(วัน)': daysLeft(lot.expirationDate),
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'VaccineLots');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    XLSX.writeFile(wb, `vaccine-lots-${stamp}.xlsx`);
  };

  // MovementModal RECEIVE
  const openReceiveForLot = (lotNo: string) => {
    setMmAction('RECEIVE');
    setMmPrefillLotNo(lotNo);
    setMmOpen(true);
  };

  // ===== Helper สำหรับ modal รายละเอียด =====
  const dosesPerVialFrom = (usage?: string) => {
    const m = /^1:(\d+)$/i.exec(usage ?? '');
    return m ? Number(m[1]) : 1;
  };
  const computeVials = (qty?: number, usage?: string) => {
    if (!qty || qty <= 0) return null;
    const dpv = dosesPerVialFrom(usage);
    if (!dpv) return null;
    return Math.round(qty / dpv);
  };

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
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <IconBadge><CubeIcon className="w-6 h-6" /></IconBadge>
            จัดการล็อตวัคซีน
          </h1>
          <RainbowChip label={`ทั้งหมด ${filteredLots.length}/${lots.length} รายการ`} />
        </div>

        <div className="flex gap-2">
          <Link
            href="/lots/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 shadow hover:opacity-95"
            title="ไปหน้าเพิ่มล็อตใหม่"
          >
            <PlusIcon className="w-5 h-5" />
            เพิ่มล็อตใหม่
          </Link>

          <Link
            href="/stock"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow hover:opacity-95"
            title="ไปหน้า Stock"
          >
            <BuildingStorefrontIcon className="w-5 h-5" />
            ไปหน้า Stock
          </Link>

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
              className="pl-10 pr-9 py-2 border rounded-md bg-white border-slate-200 text-slate-900 shadow-sm"
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
            className="px-3 py-2 border rounded-md bg-white border-slate-200 text-slate-900 shadow-sm"
          >
            <option value="ทั้งหมด">-- สถานะทั้งหมด --</option>
            <option value="USABLE">{STATUS_THAI.USABLE}</option>
            <option value="NEAR_EXPIRE">{STATUS_THAI.NEAR_EXPIRE}</option>
            <option value="EXPIRED">{STATUS_THAI.EXPIRED}</option>
            <option value="DESTROYED">{STATUS_THAI.DESTROYED}</option>
          </select>
        </div>
      </div>

      {loading && <div className="mb-3 text-sm text-slate-600">กำลังโหลดข้อมูล…</div>}
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
            {filteredLots.map((lot, idx) => {
              const liveStatus = computeStatus(lot.expirationDate);
              const remain = daysLeft(lot.expirationDate);
              return (
                <tr
                  key={lot.id}
                  className="border-t border-slate-200/60 hover:bg-gradient-to-r hover:from-violet-50/70 hover:to-sky-50/70 transition-colors"
                >
                  <td className="px-4 py-2 text-center text-slate-800">{idx + 1}</td>
                  <td className="px-4 py-2 font-semibold text-slate-900">{lot.lotNumber}</td>
                  <td className="px-4 py-2 text-slate-900">{lot.brand}</td>
                  <td className="px-4 py-2 text-slate-900">
                    {formatDate(lot.expirationDate)}{' '}
                    <span className="text-xs text-slate-600">({remain} วัน)</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLOR[liveStatus]}`}>
                      {STATUS_THAI[liveStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center space-x-2">
                    <button
                      onClick={() => openDetail(lot.lotNumber)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-sm shadow-sm"
                      title="รายละเอียด"
                    >
                      <InformationCircleIcon className="w-4 h-4" />
                      รายละเอียด
                    </button>
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
              );
            })}
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

      {/* Edit Modal */}
      {editOpen && editLot && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-xl rounded-xl shadow-xl p-6 ring-1 ring-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">แก้ไขล็อต: {editLot.lotNumber}</h3>
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
                  className="w-full px-3 py-2 border rounded-md bg-white border-slate-200 text-slate-900"
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
                  className="w-full px-3 py-2 border rounded-md bg-white border-slate-200 text-slate-900"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">Batch Number</label>
                <input
                  type="text"
                  value={editForm.batchNumber}
                  onChange={(e) => setEditForm((s) => ({ ...s, batchNumber: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md bg-white border-slate-200 text-slate-900"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">Serial Number</label>
                <input
                  type="text"
                  value={editForm.serialNumber}
                  onChange={(e) => setEditForm((s) => ({ ...s, serialNumber: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md bg-white border-slate-200 text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 rounded-lg border text-slate-800 border-slate-200 hover:bg-slate-50"
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

      {/* Detail Modal –– ปรับชื่อ/สี/ดีไซน์ + แสดงข้อมูลครบ */}
      {detailOpen && detailData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden">
            {/* header bar */}
            <div className="bg-gradient-to-r from-sky-600 via-violet-600 to-fuchsia-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">
                  แสดงรายละเอียดล็อต: <span className="font-bold">{detailData.lotNo}</span>
                </h3>
                <button
                  onClick={() => setDetailOpen(false)}
                  className="rounded-full p-1.5 bg-white/15 hover:bg-white/25 transition"
                  title="ปิด"
                >
                  <XMarkIcon className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* top stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">สถานะ</div>
                  <div className="mt-1">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-sm ${STATUS_COLOR[computeStatus(detailData.expirationDate)]}`}
                    >
                      {STATUS_THAI[computeStatus(detailData.expirationDate)]}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">หมดอายุ</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {formatDate(detailData.expirationDate)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">เหลือ (วัน)</div>
                  <div className="mt-1 font-semibold text-slate-900">{daysLeft(detailData.expirationDate)}</div>
                </div>
              </div>

              {/* details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-600">Lot No:</span> <span className="font-semibold text-slate-900">{detailData.lotNo}</span></div>
                <div><span className="text-slate-600">Vaccine ID:</span> <span className="font-semibold text-slate-900">{detailData.vaccineId}</span></div>
                <div><span className="text-slate-600">ยี่ห้อ:</span> <span className="font-semibold text-slate-900">{detailData.vaccine?.name || '-'}</span></div>
                <div><span className="text-slate-600">ประเภทวัคซีน:</span> <span className="font-semibold text-slate-900">{detailData.vaccine?.type || '-'}</span></div>
                <div><span className="text-slate-600">การใช้งาน (usageType):</span> <span className="font-semibold text-slate-900">{detailData.vaccine?.usageType || '-'}</span></div>
                <div><span className="text-slate-600">โด้ส/ขวด (doses per vial):</span> <span className="font-semibold text-slate-900">{dosesPerVialFrom(detailData.vaccine?.usageType)}</span></div>
                {/* <div><span className="text-slate-600">จำนวนทั้งหมด (โดส):</span> <span className="font-semibold text-slate-900">{detailData.quantity ?? 0}</span></div> */}
                {/* <div><span className="text-slate-600">vials (จำนวนขวด):</span> <span className="font-semibold text-slate-900">{computeVials(detailData.quantity, detailData.vaccine?.usageType) ?? '-'}</span></div> */}
                <div><span className="text-slate-600">Batch Number:</span> <span className="font-semibold text-slate-900">{detailData.batchNumber || '-'}</span></div>
                {/* <div><span className="text-slate-600">Serial Number:</span> <span className="font-semibold text-slate-900">{detailData.serialNumber || '-'}</span></div> */}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setDetailOpen(false)}
                  className="px-4 py-2 rounded-lg border text-slate-900 border-slate-200 hover:bg-slate-50"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MovementModal */}
      <MovementModal
        open={mmOpen}
        defaultAction={mmAction}
        onClose={() => setMmOpen(false)}
        onSaved={() => {
          setMmOpen(false);
          fetchLots();
        }}
        warehouses={warehouses}
        prefillLotNo={mmPrefillLotNo}
      />
    </div>
  );
}

