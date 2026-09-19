'use client'

import { usePathname, useRouter } from 'next/navigation'
import { SearchInput } from '@/components/ui/search-input'

interface WebOrderSearchProps {
  search: string
}

export function WebOrderSearch({ search }: WebOrderSearchProps) {
  const router = useRouter()
  const pathname = usePathname()

  function apply(next: string) {
    const params = new URLSearchParams()
    if (next.trim()) params.set('buscar', next.trim())
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="w-full sm:w-72">
      <SearchInput value={search} onChange={apply} placeholder="Buscar por referencia, cliente o teléfono..." />
    </div>
  )
}