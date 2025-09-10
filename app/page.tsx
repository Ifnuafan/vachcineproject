'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, getSession } from 'next-auth/react'
import {
  LockClosedIcon,
  EnvelopeIcon,
  ArrowRightCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const waitForSession = async (tries = 6, delayMs = 200) => {
    for (let i = 0; i < tries; i++) {
      const s = await getSession()
      if (s) return s
      await new Promise((r) => setTimeout(r, delayMs))
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('รูปแบบอีเมลไม่ถูกต้อง')
      return
    }

    setLoading(true)
    try {
      const res = await signIn('credentials', { email, password, redirect: false })
      if (!res || res.error) {
        setError(res?.error || 'เข้าสู่ระบบล้มเหลว')
        setLoading(false)
        return
      }

      const session = await waitForSession()
      const role = session?.user?.role

      if (role === 'ADMIN') router.push('/dashboard')
      else if (role === 'STAFF') router.push('/home')
      else setError('ไม่พบสิทธิ์ผู้ใช้')
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden
      bg-gradient-to-br from-sky-50 via-indigo-50 to-white">

      {/* Floating pastel bubbles */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute -top-28 -right-24 w-96 h-96 rounded-full blur-3xl
                     bg-sky-200/40"
        />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.1 }}
          className="absolute -bottom-24 -left-20 w-[28rem] h-[28rem] rounded-full blur-3xl
                     bg-cyan-200/40"
        />
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2
                     w-[36rem] h-[36rem] rounded-full blur-3xl bg-indigo-200/30"
        />
        {/* Soft cloud arcs */}
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(80%_60%_at_50%_-20%,rgba(186,230,253,.6),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(80%_60%_at_50%_120%,rgba(199,210,254,.5),transparent)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 36, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-full max-w-md p-8 rounded-3xl
          backdrop-blur-xl bg-white/75 border border-white/80
          shadow-[0_10px_40px_rgba(14,165,233,.18)]"
      >
        {/* Header / Branding */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="mb-3 inline-flex items-center justify-center w-14 h-14 rounded-2xl
                          bg-gradient-to-tr from-sky-500 to-cyan-400 text-white shadow-lg">
            <LockClosedIcon className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight
                         bg-clip-text text-transparent
                         bg-gradient-to-r from-sky-700 via-sky-600 to-cyan-600">
            ระบบบริหารจัดการวัคซีน
          </h1>
          <p className="text-sm text-sky-900/70 mt-1">
            สำหรับโรงพยาบาลส่งเสริมสุขภาพตำบลยาบี
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block mb-1 text-sm font-medium text-sky-900/90">
              อีเมล
            </label>
            <div className="relative">
              <EnvelopeIcon className="w-5 h-5 text-sky-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-2.5 pl-10 pr-4 rounded-2xl
                  border border-sky-100 bg-white/80 text-sky-900
                  outline-none focus:ring-4 focus:ring-sky-300/30 focus:border-sky-400
                  placeholder:text-sky-400/70 transition"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block mb-1 text-sm font-medium text-sky-900/90">
              รหัสผ่าน
            </label>
            <div className="relative">
              <LockClosedIcon className="w-5 h-5 text-sky-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-2.5 pl-10 pr-10 rounded-2xl
                  border border-sky-100 bg-white/80 text-sky-900
                  outline-none focus:ring-4 focus:ring-cyan-300/30 focus:border-cyan-400
                  placeholder:text-sky-400/70 transition"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-sky-500 hover:text-sky-700"
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm rounded-2xl px-3 py-2
                bg-rose-50 text-rose-700 border border-rose-200"
            >
              {error}
            </motion.div>
          )}

          {/* Submit */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.01 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl
              bg-gradient-to-r from-sky-500 via-sky-500 to-cyan-500
              text-white font-semibold text-base shadow-lg
              hover:opacity-95 focus:outline-none focus:ring-4 focus:ring-sky-300/40
              disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                กำลังเข้าสู่ระบบ...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                เข้าสู่ระบบ
                <ArrowRightCircleIcon className="w-5 h-5" />
              </span>
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-xs sm:text-sm text-center text-sky-900/70">
          <p>รพ.สต. ตำบลยาบี • เวอร์ชัน 1.0.0</p>
          <p className="mb-4">📞 02-123-4567 • ✉ vaccine@example.com</p>
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline"
          >
            กลับหน้าหลัก
            <ArrowRightCircleIcon className="w-4 h-4" />
          </Link>
        </div>

        {/* Decorative bottom glow */}
        <div className="pointer-events-none absolute -z-10 inset-x-10 -bottom-8 h-24
                        bg-[radial-gradient(60%_60%_at_50%_0%,rgba(125,211,252,.45),transparent)]" />
      </motion.div>
    </div>
  )
}
