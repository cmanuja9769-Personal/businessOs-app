import { useEffect, useRef } from 'react'

/**
 * Hook to prevent number inputs from changing value on mouse wheel/trackpad scroll
 * when the input is focused
 */
export function useNumberInputScrollPrevention() {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    const handleWheel = (e: WheelEvent) => {
      // Only prevent scroll on number inputs
      if (input.type !== 'number') return

      // Only prevent if the input is focused
      if (document.activeElement !== input) return

      // Prevent the default scroll behavior
      e.preventDefault()
    }

    // Use capture phase to intercept the event early
    input.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      input.removeEventListener('wheel', handleWheel)
    }
  }, [])

  return inputRef
}

/**
 * Global setup function to prevent number inputs from changing on scroll
 * Call this once in your app root or layout
 */
export function setupNumberInputScrollPrevention() {
  if (typeof document === 'undefined') return

  const handleWheel = (e: WheelEvent) => {
    const target = e.target as HTMLElement
    
    // Check if target is a number input
    if (target.tagName !== 'INPUT') return
    
    const input = target as HTMLInputElement
    if (input.type !== 'number') return

    // Only prevent if the input is focused
    if (document.activeElement !== input) return

    // Prevent the default scroll behavior
    e.preventDefault()
  }

  // Add listener to document in capture phase
  document.addEventListener('wheel', handleWheel, { passive: false, capture: true })

  // Return cleanup function
  return () => {
    document.removeEventListener('wheel', handleWheel, true)
  }
}
