'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PlusIcon,
  TagIcon,
  BeakerIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';

/* ========= Types ========= */
type Vaccine = {
  id: number;
  name: string;
  type: string;
  requiredDoses: number;
  usageType: string; // "1:1" | "1:10" ...
  updatedAt: string;
};

type LotStatus = 'USABLE' | 'NEAR_EXPIRE' | 'EXPIRED' | 'DESTROYED';

export type VaccineLot = {
  id: string;
  lotNumber: string;
  brand: string;
  expirationDate: string;
  quantity: number;
  status: LotStatus;
};

type Warehouse = { id: number; name: string; type: 'MAIN' | 'SUB'; note?: string | null };

type Props = {
  mode?: 'single' | 'wizard';
  onSaved?: () => void;
  onClose?: () => void;
  onAdd?: (lot: VaccineLot) => void;
  onAddVaccine?: () => void;
};

/* ========= helpers & base styles ========= */
const baseInput =
  'h-11 w-full rounded-xl border border-slate-200 bg-white text-slate-900 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400/70 focus:border-violet-400 transition shadow-sm';
const withIconPadding = 'pl-12';

const required = (v?: string | number | null) =>
  v !== undefined && v !== null && String(v).trim() !== '';

/** LOT: A-Z0-9 only + auto-dash after 4 chars (pure DOM; no state) */
function maskLotAndCaretDom(el: HTMLInputElement) {
  const raw = (el.value || '').toUpperCase();
  const caret = el.selectionStart ?? raw.length;
  // กรองเฉพาะ A-Z0-9
  const before = raw.slice(0, caret).replace(/[^A-Z0-9-]/g, '').replace(/-/g, '');
  const all = raw.replace(/[^A-Z0-9-]/g, '').replace(/-/g, '');
  // Mask: ใส่ dash หลัง 4 ตัวอักษร
  const masked = all.length <= 4 ? all : `${all.slice(0, 4)}-${all.slice(4, 12)}`;
  // คำนวณตำแหน่ง caret ใหม่
  const newCaret = before.length <= 4 ? before.length : Math.min(masked.length, before.length + 1);

  if (el.value !== masked) {
    el.value = masked;
    try {
      el.setSelectionRange(newCaret, newCaret);
    } catch {}
  }
}

/* ========= Component ========= */
export default function LotForm({
  mode = 'wizard',
  onSaved,
  onClose,
  onAdd,
  onAddVaccine,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ☑ ป้องกัน hydration mismatch: เรนเดอร์หลัง mount เท่านั้น
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // today (ใช้หลัง mount เท่านั้น)
  const [today, setToday] = useState<string>('');
  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  // ✅ เพิ่ม state สำหรับ "วันที่ทำรายการ" (transactionDate)
  const [transactionDate, setTransactionDate] = useState<string>('');
  useEffect(() => {
    // default = วันนี้ (หลัง mount เพื่อกัน hydration)
    setTransactionDate(new Date().toISOString().slice(0, 10));
  }, []);

  // prefill vaccine from URL (client only)
  const prefillStr = mounted
    ? searchParams.get('prefillVaccineId') ?? searchParams.get('vaccineId')
    : null;
  const parsed = prefillStr != null ? Number(prefillStr) : NaN;
  const urlPrefillId = Number.isFinite(parsed) && !Number.isNaN(parsed) ? parsed : null;

  // data sources
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [loadingVaccines, setLoadingVaccines] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWh, setLoadingWh] = useState(false);

  // wizard
  const [step, setStep] = useState(0);
  const [q, setQ] = useState('');

  // form state
  const [vaccineId, setVaccineId] = useState<number | ''>('');
  const [expirationDate, setExpirationDate] = useState(''); // YYYY-MM-DD
  const [vials, setVials] = useState<number | ''>(''); // number or ''
  const [targetWarehouseId, setTargetWarehouseId] = useState<number | ''>(''); // warehouse

  // ✅ lotNo เป็น controlled
  const [lotNo, setLotNo] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [isPrefilled, setIsPrefilled] = useState(false);

  // refs / IME flags (สำหรับ input ที่ต้องพิมพ์ลื่น ๆ)
  const lotRef = useRef<HTMLInputElement | null>(null);
  const isCompLotRef = useRef(false);

  // Ref เพื่อตรวจสอบว่าเข้า step 1 ครั้งแรกหรือไม่ (เพื่อ autoFocus)
  const firstStep1Entry = useRef(true);

  // load data (client only)
  useEffect(() => {
    if (!mounted) return;

    (async () => {
      try {
        setLoadingVaccines(true);
        const qs = new URLSearchParams({ page: '1', limit: '1000' });
        // NOTE: endpoint เดิมในโค้ดเป็น /api/cines (คงไว้ตามระบบเดิม)
        const res = await fetch(`/api/cines?${qs.toString()}`, { cache: 'no-store' });
        const json = await res.json();
        setVaccines(json.items ?? []);
      } catch {
        /* ignore */
      } finally {
        setLoadingVaccines(false);
      }
    })();

    (async () => {
      try {
        setLoadingWh(true);
        const res = await fetch('/api/warehouses?limit=200', { cache: 'no-store' });
        const data = await res.json();
        const items: Warehouse[] = data.items ?? [];

        // ✅ เอาเฉพาะคลังย่อย (SUB)
        const subs = items.filter((w) => w.type === 'SUB');

        setWarehouses(subs);
        setTargetWarehouseId(subs[0]?.id ?? '');
      } catch {
        /* ignore */
      } finally {
        setLoadingWh(false);
      }
    })();
  }, [mounted]);

  // prefill -> skip chooser (เข้าครั้งแรกจาก URL)
  useEffect(() => {
    if (!mounted) return;

    if (urlPrefillId) {
      setIsPrefilled(true);
      setStep(1);
      setVaccineId(urlPrefillId);
      // โฟกัส lot หลัง DOM พร้อมเมื่อเข้าจาก URL
      firstStep1Entry.current = false; // นับว่ามีการเข้าครั้งแรกแล้ว
      setTimeout(() => lotRef.current?.focus(), 0);
    } else {
      setIsPrefilled(false);
    }
  }, [mounted, urlPrefillId]);

  // โฟกัสเมื่อเข้าสู่ Step 1 จาก Chooser
  useEffect(() => {
    if (step === 1 && firstStep1Entry.current) {
      firstStep1Entry.current = false;
      setTimeout(() => lotRef.current?.focus(), 0);
    }
  }, [step]);

  // ถ้ากลับไป step 0 ให้ reset first entry flag
  useEffect(() => {
    if (step === 0) {
      firstStep1Entry.current = true;
    }
  }, [step]);

  const filteredVaccines = useMemo(() => {
    const list = vaccines;
    if (!q.trim()) return list;
    const t = q.toLowerCase();
    return list.filter((v) => [v.name, v.type, v.usageType].join(' ').toLowerCase().includes(t));
  }, [q, vaccines]);

  const selected = useMemo(
    () => vaccines.find((v) => v.id === vaccineId),
    [vaccineId, vaccines]
  );

  // derive dosesPerVial from usageType e.g. "1:10"
  const dosesPerVial = useMemo(() => {
    const raw = selected?.usageType ?? '1:1';
    const m = /^1:(\d+)$/.exec(raw);
    return m ? Number(m[1]) : 1;
  }, [selected?.usageType, selected]);

  const computedQuantity = useMemo(() => {
    if (vials === '' || !Number.isFinite(Number(vials))) return 0;
    return Number(vials) * dosesPerVial;
  }, [vials, dosesPerVial]);

  /* ========= mask handlers (pure DOM; ไม่ยุ่งกับ state) ========= */

  // LOT Number handlers
  const handleLotInput = (e: React.FormEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    if (isCompLotRef.current) return;
    maskLotAndCaretDom(el);
    setLotNo(el.value);
  };
  const handleLotCompositionStart = () => {
    isCompLotRef.current = true;
  };
  const handleLotCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isCompLotRef.current = false;
    maskLotAndCaretDom(e.currentTarget);
    setLotNo(e.currentTarget.value);
  };

  // submit -> RECEIVE directly to inventory
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOkMsg('');

    const lotNoValue = lotNo.trim();

    // Validation
    if (!required(vaccineId) || !required(lotNoValue) || !required(expirationDate)) {
      setError('กรอกข้อมูลให้ครบ: วัคซีน, รหัสล็อต, วันหมดอายุ');
      return;
    }
    if (today && expirationDate < today) {
      setError('วันหมดอายุต้องไม่ย้อนหลัง');
      return;
    }
    if (!targetWarehouseId) {
      setError('เลือกคลังที่จะรับเข้า');
      return;
    }
    if (!vials || Number(vials) <= 0) {
      setError('กรอกจำนวนขวด (vials) มากกว่า 0');
      return;
    }
    if (!required(transactionDate)) {
      setError('เลือกวันที่ทำรายการ');
      return;
    }
    const quantity = computedQuantity;
    if (quantity <= 0) {
      setError('คำนวณจำนวนโดสไม่ได้ กรุณาตรวจสอบ vials/usageType');
      return;
    }

    // quick duplicate check (optional)
    try {
      const head = await fetch(`/api/lots/${encodeURIComponent(lotNoValue)}`, { method: 'HEAD' });
      if (head.ok) {
        setError('รหัสล็อตนี้มีอยู่แล้วในระบบ');
        return;
      }
      if (head.status === 405 || head.status === 501) {
        const getDup = await fetch(`/api/lots/${encodeURIComponent(lotNoValue)}`, { method: 'GET' });
        if (getDup.ok) {
          setError('รหัสล็อตนี้มีอยู่แล้วในระบบ');
          return;
        }
      }
    } catch {
      /* ignore network check */
    }

    setSaving(true);
    try {
      const res = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECEIVE',
          lotNo: lotNoValue,
          quantity, // doses
          targetWarehouseId: Number(targetWarehouseId),
          remarks: `Receive via LotForm: ${vials} vial(s) × ${dosesPerVial} doses/vial`,
          vaccineId: Number(vaccineId),
          expirationDate, // YYYY-MM-DD
          // ✅ ส่งวันที่ทำรายการจากฟิลด์ที่ผู้ใช้เลือก (YYYY-MM-DD)
          transactionDate,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || 'บันทึกไม่สำเร็จ');
      }

      // optimistic UI for caller (not strictly needed)
      onAdd?.({
        id: lotNoValue,
        lotNumber: lotNoValue,
        brand: selected?.name ?? '-',
        expirationDate,
        quantity,
        status: 'USABLE',
      });

      setOkMsg('บันทึกล็อตและรับเข้าคลังสำเร็จ');

      // reset เฉพาะฟิลด์ที่ต้องการ
      setLotNo('');
      setExpirationDate('');
      setVials('');

      onSaved?.();
    } catch (err: any) {
      setError(err?.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleAddVaccineClick = () => {
    if (onAddVaccine) onAddVaccine();
    else router.push('/cines');
  };

  /* ========= Inner blocks ========= */
  // ข้างบน (ใกล้ ๆ types)
type IconSize = 'sm' | 'md' | 'lg'

// …

function IconBadge(
  { children, size = 'md' }: { children: React.ReactNode; size?: IconSize }
) {
  const sz =
    size === 'sm' ? 'h-8 w-8 text-[14px]'
    : size === 'lg' ? 'h-12 w-12 text-[18px]'
    : 'h-10 w-10 text-[16px]';

  return (
    <span className="inline-flex items-center justify-center rounded-xl text-white shadow-sm bg-gradient-to-tr from-sky-400 via-violet-400 to-pink-400 ring-1 ring-violet-200/60"
          style={{ backdropFilter: 'saturate(140%) blur(0.5px)' }}>
      <span className={`flex items-center justify-center ${sz}`}>{children}</span>
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

  function FieldWrapper({
    label,
    hint,
    icon,
    iconBgClass = 'bg-gray-100 text-gray-500',
    children,
  }: {
    label: string;
    hint?: string;
    icon?: React.ReactNode;
    iconBgClass?: string;
    children: React.ReactNode;
  }) {
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-800">{label}</label>
        <div className="relative group rounded-xl transition">
          {icon && (
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 grid place-items-center h-7 w-7 rounded-lg shadow-sm ${iconBgClass} ring-1 ring-black/5 group-focus-within:scale-105 transition-transform`}
            >
              {icon}
            </span>
          )}
          {children}
        </div>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }

  function Header({ title, right }: { title: React.ReactNode; right?: React.ReactNode }) {
    return (
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <IconBadge size="lg">
            <CheckCircleIcon className="w-6 h-6" />
          </IconBadge>
          {title}
        </h1>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    );
  }

  function Alerts() {
    return (
      <>
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5" />
            <span>{error}</span>
          </div>
        )}
        {okMsg && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <CheckCircleIcon className="mt-0.5 h-5 w-5" />
            <span>{okMsg}</span>
          </div>
        )}
      </>
    );
  }

  function VaccineChooser() {
    return (
      <>
        <Header title={<>เลือกวัคซีน</>} right={<RainbowChip label={`ทั้งหมด ${vaccines.length} รายการ`} />} />

        <div className="mb-4 flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
          <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหา ชื่อวัคซีน / ประเภท / การใช้งาน"
            className="flex-1 bg-transparent focus:outline-none text-slate-800"
          />
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
          {loadingVaccines ? (
            <div className="text-center text-slate-500 py-8">กำลังโหลด…</div>
          ) : filteredVaccines.length === 0 ? (
            <div className="text-center text-slate-400 py-8">ไม่พบวัคซีน</div>
          ) : (
            filteredVaccines.map((v) => (
              <label
                key={v.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:bg-slate-50 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="vaccine"
                    className="h-4 w-4"
                    checked={vaccineId === v.id}
                    onChange={() => setVaccineId(v.id)}
                  />
                  <div>
                    <div className="font-medium text-slate-800">{v.name}</div>
                    <div className="text-xs text-slate-500">
                      {v.type} · {v.usageType} · แนะนำจำนวนเข็มวัคซีนครบชุด {v.requiredDoses}
                    </div>
                  </div>
                </div>
              </label>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-between items-center">
          <a
            href="/lots"
            className="inline-flex items-center gap-2 h-11 rounded-xl border border-slate-200 px-4 text-slate-700 hover:bg-slate-50"
          >
            <ArrowTopRightOnSquareIcon className="h-5 w-5" />
            ไปหน้ารายการ
          </a>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => (onClose ? onClose() : router.back())}
              className="h-11 rounded-xl border border-slate-200 px-5 text-slate-700 hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={!vaccineId}
              onClick={() => setStep(1)}
              className="h-11 rounded-xl px-5 text-white shadow bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 hover:opacity-95 disabled:opacity-50 inline-flex items-center gap-2"
            >
              ถัดไป
              <CheckCircleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </>
    );
  }

  function DetailsForm() {
    return (
      <>
        <Header
          title={<>เพิ่มล็อตวัคซีน (รับเข้าคลังโดยตรง)</>}
          right={
            <>
              <a
                href="/stock"
                className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 text-sm"
                title="ไปหน้าคลัง"
              >
                <BuildingStorefrontIcon className="w-4 h-4" />
                Stock
              </a>
              {selected ? <RainbowChip label={selected.name} /> : null}
            </>
          }
        />

        <Alerts />

        {selected && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-sm text-slate-700">
            <div className="font-medium">วัคซีนที่เลือก</div>
            <div className="text-slate-600">
              {selected.name} · {selected.type} · ใช้ {selected.usageType} (≈ {dosesPerVial} โดส/ขวด) · แนะนำจำนวนเข็มวัคซีนครบชุด{' '}
              {selected.requiredDoses}
            </div>
          </div>
        )}

        <form
          onSubmit={submit}
          className="grid grid-cols-1 gap-5 md:grid-cols-2"
          /* คง Escape สำหรับย้อนกลับ */
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              if (onClose) onClose();
              else if (mode === 'wizard' && step === 1) setStep(0);
            }
          }}
        >
          {/* 1. lotNo (controlled) */}
          <FieldWrapper
            label="รหัสล็อต (lotNo) *"
            hint="พิมพ์ได้ต่อเนื่อง ระบบจะใส่ขีดอัตโนมัติ"
            iconBgClass="bg-amber-50 text-amber-600"
            icon={<TagIcon className="h-4 w-4" />}
          >
            <input
              ref={lotRef}
              id="lotNo" // ID: 1
              type="text"
              value={lotNo}
              onInput={handleLotInput}
              onCompositionStart={handleLotCompositionStart}
              onCompositionEnd={handleLotCompositionEnd}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="เช่น AZPZ-0425"
              maxLength={13}
              className={`${baseInput} ${withIconPadding} group-focus-within:shadow-md uppercase tracking-wider`}
              aria-label="รหัสล็อต"
            />
          </FieldWrapper>

          {/* 2. vaccine (prefilled or select) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-800">วัคซีน (vaccineId) *</label>
              <button
                type="button"
                onClick={handleAddVaccineClick}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-medium text-white hover:from-violet-500 hover:to-indigo-500"
              >
                <PlusIcon className="h-4 w-4" />
                เพิ่มวัคซีน
              </button>
            </div>
            <FieldWrapper label="" iconBgClass="bg-indigo-50 text-indigo-600" icon={<BeakerIcon className="h-4 w-4" />}>
              {isPrefilled ? (
                <div className={`${baseInput} ${withIconPadding} bg-slate-50 text-slate-700 select-none`}>
                  {selected ? `${selected.name} · ${selected.type} · ${selected.usageType}` : `ID: ${vaccineId}`}
                  <input type="hidden" name="vaccineId" value={String(vaccineId)} />
                </div>
              ) : (
                <select
                  id="vaccineId" // ID: 2
                  value={vaccineId}
                  onChange={(e) => setVaccineId(e.target.value ? Number(e.target.value) : '')}
                  className={`${baseInput} ${withIconPadding} disabled:opacity-60 group-focus-within:shadow-md`}
                  disabled={loadingVaccines}
                >
                  <option value="">{loadingVaccines ? 'กำลังโหลด...' : '-- เลือกวัคซีน --'}</option>
                  {vaccines.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} · {v.type} · {v.usageType} (แนะนำจำนวนเข็มวัคซีนครบชุด {v.requiredDoses})
                    </option>
                  ))}
                </select>
              )}
            </FieldWrapper>
          </div>

          {/* 3. expirationDate */}
          <FieldWrapper
            label="วันหมดอายุ (expirationDate) *"
            hint="ระบบจะคำนวณสถานะล็อตอัตโนมัติ"
            iconBgClass="bg-sky-50 text-sky-600"
            icon={<CalendarDaysIcon className="h-4 w-4" />}
          >
            <input
              id="expirationDate" // ID: 3
              type="date"
              value={expirationDate}
              min={today || undefined /* กัน hydration: ใส่หลัง mount */}
              onChange={(e) => setExpirationDate(e.target.value)}
              className={`${baseInput} ${withIconPadding} group-focus-within:shadow-md`}
            />
          </FieldWrapper>

          {/* 3.1 transactionDate (ใหม่) */}
          <FieldWrapper
            label="วันที่ทำรายการ (transactionDate) *"
            hint="วัน-เดือน-ปี ที่บันทึกรับเข้าคลังสำหรับล็อตนี้"
            iconBgClass="bg-violet-50 text-violet-600"
            icon={<CalendarDaysIcon className="h-4 w-4" />}
          >
            <input
              id="transactionDate" // ID: 3.1
              type="date"
              value={transactionDate}
              // ไม่บังคับ min/max เพื่อให้แก้ย้อนหลังได้ตามสิทธิ์/กรณีใช้งาน
              onChange={(e) => setTransactionDate(e.target.value)}
              className={`${baseInput} ${withIconPadding} group-focus-within:shadow-md`}
            />
          </FieldWrapper>

          {/* 4. vials */}
          <FieldWrapper
            label="vials (จำนวนขวด) *"
            hint="บันทึกจำนวนขวดที่ได้รับเข้ามา • ระบบจะแปลงเป็นโดสด้วย usageType ของวัคซีน"
            iconBgClass="bg-emerald-50 text-emerald-600"
            icon={<CheckCircleIcon className="h-4 w-4" />}
          >
            <input
              id="vials" // ID: 4
              type="number"
              min={1}
              step={1}
              value={vials}
              onChange={(e) => {
                const val = e.target.value;
                setVials(val === '' ? '' : Math.max(0, Math.floor(Number(val))));
              }}
              onWheel={(e) => (e.currentTarget as HTMLInputElement).blur() }
              className={`${baseInput} ${withIconPadding} group-focus-within:shadow-md`}
              placeholder="เช่น 50"
            />
          </FieldWrapper>

          {/* 5. warehouse — เฉพาะ SUB เท่านั้น */}
          <FieldWrapper
            label="คลังที่จะรับเข้า *"
            iconBgClass="bg-violet-50 text-violet-600"
            icon={<BuildingStorefrontIcon className="h-4 w-4" />}
          >
            <select
              id="targetWarehouseId" // ID: 5 (ช่องสุดท้ายก่อน Submit)
              value={targetWarehouseId}
              onChange={(e) => setTargetWarehouseId(e.target.value ? Number(e.target.value) : '')}
              className={`${baseInput} ${withIconPadding}`}
              disabled={loadingWh}
            >
              <option value="">{loadingWh ? 'กำลังโหลด...' : '-- เลือกคลังย่อย --'}</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (SUB)
                </option>
              ))}
            </select>
          </FieldWrapper>

          {/* computed doses preview */}
          <div className="md:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
              <div>
                ปริมาณที่จะรับเข้า:{' '}
                <span className="font-semibold">
                  {vials || 0} ขวด × {dosesPerVial} โดส/ขวด = {computedQuantity.toLocaleString()} โดส
                </span>
              </div>
              <div className="mt-1 text-slate-600">
                วันที่ทำรายการ: <span className="font-medium">{transactionDate || '-'}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="md:col-span-2 flex justify-between items-center pt-1">
            {mode === 'wizard' ? (
              <button
                type="button"
                onClick={() => setStep(0)}
                className="inline-flex items-center gap-2 h-11 rounded-xl border border-slate-200 px-4 text-slate-700 hover:bg-slate-50"
                title="กลับไปเลือกวัคซีน"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                ย้อนกลับ
              </button>
            ) : (
              <a
                href="/stock"
                className="inline-flex items-center gap-2 h-11 rounded-xl border border-slate-200 px-4 text-slate-700 hover:bg-slate-50"
                title="ไปหน้าคลัง"
              >
                <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                ไปหน้าคลัง
              </a>
            )}
            <div className="flex gap-2">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 rounded-xl border border-slate-200 px-5 text-slate-700 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="h-11 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 px-5 font-medium text-white shadow hover:opacity-95 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {saving ? 'กำลังบันทึก…' : 'บันทึกและรับเข้าคลัง'}
                <CheckCircleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </form>
      </>
    );
  }

  // ถ้ายังไม่ mount ให้ไม่เรนเดอร์อะไร เพื่อกัน hydration mismatch จาก ext/วันที่
  if (!mounted) return null;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-50 via-sky-50 to-white" />
        <div className="absolute -top-28 -right-28 w-96 h-96 rounded-full bg-fuchsia-200/30 blur-3xl" />
        <div className="absolute -bottom-28 -left-28 w-[28rem] h-[28rem] rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-slate-200">
        {mode === 'wizard'
          ? (isPrefilled ? <DetailsForm /> : step === 0 ? <VaccineChooser /> : <DetailsForm />)
          : <DetailsForm />}
      </div>
    </div>
  );
}
