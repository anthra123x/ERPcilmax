'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'

export function CreditSearch({ initialSearch, estado }: { initialSearch: string; estado: string }) {
  const router = useRouter()
  const [value, setValue] = useState(initialSearch)

  useEffect(() => {
    setValue(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ estado })
      if (value.trim()) params.set('search', value.trim())
      router.replace(`/credits?${params.toString()}`)
    }, 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, estado])

  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Buscar factura o cliente..."
      className="w-64"
    />
  )
}
