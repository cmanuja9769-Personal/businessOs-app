"use client"

import { ErrorBoundaryCard } from "@/components/ui/error-boundary-card"

export default function InventoryError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorBoundaryCard error={error} reset={reset} title="Failed to load inventory" />
}
