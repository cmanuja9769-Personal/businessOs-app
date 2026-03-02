"use client"

import { ErrorBoundaryCard } from "@/components/ui/error-boundary-card"

export default function ItemsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorBoundaryCard error={error} reset={reset} title="Failed to load items" />
}
