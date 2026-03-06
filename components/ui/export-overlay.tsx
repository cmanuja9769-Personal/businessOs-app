"use client"

import { useSyncExternalStore } from "react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Loader2, FileDown } from "lucide-react"

interface ExportOverlayProps {
  readonly visible: boolean
  readonly message?: string
}

function getProgressHint(seconds: number): string {
  if (seconds >= 8) return "Almost there — large reports take a moment…"
  if (seconds >= 3) return "Processing rows…"
  return ""
}

function OverlayContent({ message = "Generating PDF…" }: { readonly message: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const hint = getProgressHint(elapsed)

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-10 py-8 shadow-2xl dark:bg-zinc-900">
        <div className="relative">
          <FileDown className="h-8 w-8 text-primary opacity-20" />
          <Loader2 className="absolute inset-0 h-8 w-8 animate-spin text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">{message}</p>
        {hint && (
          <p className="text-xs text-muted-foreground animate-in fade-in duration-300">{hint}</p>
        )}
      </div>
    </div>
  )
}

const emptySubscribe = () => () => {}

export function ExportOverlay({ visible, message = "Generating PDF…" }: ExportOverlayProps) {
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false)

  if (!isClient || !visible) return null

  return createPortal(
    <OverlayContent message={message} />,
    document.body,
  )
}
