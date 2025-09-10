export function toDateOnly(d: Date | string) {
  const t = typeof d === 'string' ? new Date(d) : d
  return new Date(t.getFullYear(), t.getMonth(), t.getDate())
}

export function daysToExpire(expirationDate: string | Date) {
  const today = toDateOnly(new Date())
  const exp = toDateOnly(expirationDate)
  const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

export function formatThai(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
