"use client"

import { useEffect } from "react"
import { setupNumberInputScrollPrevention } from "@/hooks/use-number-input-scroll-prevention"

/**
 * Client component to initialize global number input scroll prevention
 */
export function NumberInputScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const cleanup = setupNumberInputScrollPrevention()
    return cleanup
  }, [])

  return <>{children}</>
}
