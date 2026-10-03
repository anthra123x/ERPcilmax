import React from 'react'
import { cn } from '@/lib/utils'

interface NovaLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showWordmark?: boolean
  wordmarkClassName?: string
  subtitle?: string
}

export function NovaLogo({ className, size = 'md', showWordmark = true, wordmarkClassName, subtitle }: NovaLogoProps) {
  const sizeClasses = {
    sm: 'h-7 w-7 rounded-lg text-[13px]',
    md: 'h-9 w-9 rounded-xl text-base',
    lg: 'h-11 w-11 rounded-2xl text-lg',
    xl: 'h-14 w-14 rounded-2xl text-2xl',
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
  }

  return (
    <div className={cn('inline-flex items-center gap-3 select-none', className)}>
      {/* Icon Badge: Modern dark rounded square with geometric stylized N */}
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center bg-gray-950 text-white font-bold shadow-xs transition-transform duration-200 ring-1 ring-white/10',
          sizeClasses[size],
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn('text-white stroke-[2.2]', iconSizes[size])}
        >
          {/* Stylized geometric N with modern node accent */}
          <path d="M5 19V5L15 19V5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="19" cy="5" r="2.2" fill="#10b981" />
        </svg>
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <div className="flex flex-col min-w-0 leading-tight">
          <div className={cn('flex items-center gap-1.5 font-bold tracking-tight text-foreground', wordmarkClassName)}>
            <span className="text-base font-extrabold tracking-tight">Nova</span>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-gray-950 text-white dark:bg-white dark:text-gray-950 tracking-wider">
              ERP
            </span>
          </div>
          {subtitle && <span className="text-[11px] font-medium text-muted-foreground truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  )
}
