'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, BuildingStorefrontIcon, PlusIcon } from '@heroicons/react/24/outline';
import LotForm from '@/components/lots/LotForm';

export default function NewLotPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen px-4 py-8">
      {/* pastel background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-50 via-sky-50 to-white" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-fuchsia-200/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      {/* header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <PlusIcon className="w-7 h-7 text-violet-600" />
            เพิ่มล็อตวัคซีน (รับเข้าคลังโดยตรง)
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/lots"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
            title="กลับหน้าแสดงข้อมูลล็อต"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            กลับหน้ารายการล็อต
          </Link>
          <Link
            href="/stock"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow hover:opacity-95"
            title="ไปหน้า Stock"
          >
            <BuildingStorefrontIcon className="w-5 h-5" />
            ไปหน้า Stock
          </Link>
        </div>
      </div>

      {/* ฟอร์มหน้าเดียว */}
      <div className="mb-6">
        <LotForm
          mode="single"
          onSaved={() => router.push('/lots')}   // บันทึกเสร็จ -> กลับไปหน้ารายการ
        />
      </div>
    </div>
  );
}
