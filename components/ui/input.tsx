"use client"

import * as React from 'react'

import { cn } from '@/lib/utils'
import { useNumberInputScrollPrevention } from '@/hooks/use-number-input-scroll-prevention'

function Input({ className, type, step, onFocus, onClick, onChange, ...props }: React.ComponentProps<'input'>) {
  const inputRef = useNumberInputScrollPrevention()
  
  return (
    <input
      ref={inputRef}
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-border focus-visible:ring-0',
        'aria-invalid:ring-0 aria-invalid:border-destructive',
        className,
      )}
      onFocus={(e) => {
        onFocus?.(e)

        if (type !== 'number') return

        const input = e.currentTarget
        if (input.value !== '0') return

        requestAnimationFrame(() => {
          try {
            input.select()
          } catch {
            // no-op
          }
        })
      }}
      onClick={(e) => {
        onClick?.(e)

        if (type !== 'number') return

        const input = e.currentTarget
        if (input.value !== '0') return

        requestAnimationFrame(() => {
          try {
            input.select()
          } catch {
            // no-op
          }
        })
      }}
      onChange={(e) => {
        if (type === 'number') {
          const stepString = step === undefined || step === null ? '1' : String(step)
          const isIntegerStep = stepString !== 'any' && !stepString.includes('.')

          if (isIntegerStep) {
            const input = e.currentTarget
            const current = input.value

            if (current !== '') {
              const isNegative = current.startsWith('-')
              const sign = isNegative ? '-' : ''
              let rest = isNegative ? current.slice(1) : current

              if (rest.startsWith('0') && rest.length > 1 && !rest.startsWith('0.')) {
                rest = rest.replace(/^0+(?=\d)/, '')
                if (rest === '') rest = '0'
              }

              const normalized = sign + rest
              if (normalized !== current) {
                input.value = normalized
              }
            }
          }
        }

        onChange?.(e)
      }}
      {...props}
    />
  )
}

export { Input }
