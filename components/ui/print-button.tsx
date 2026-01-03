"use client"

import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"

function sanitizePrintTitle(title: string) {
  return title
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
}

export function PrintButton({ title }: { title?: string }) {
  return (
    <Button
      onClick={() => {
        const originalTitle = document.title
        let fallbackTimer: number | undefined

        if (title) {
          document.title = sanitizePrintTitle(title)
          window.addEventListener(
            "afterprint",
            () => {
              if (fallbackTimer) window.clearTimeout(fallbackTimer)
              document.title = originalTitle
            },
            { once: true },
          )
        }

        window.print()

        // Fallback restore (some environments don't fire afterprint reliably).
        // Keep the title long enough for OS print dialogs (e.g., Microsoft Print to PDF).
        if (title) {
          fallbackTimer = window.setTimeout(() => {
            document.title = originalTitle
          }, 60_000)
        }
      }}
      className="gap-2"
    >
      <Printer className="w-4 h-4" />
      Print
    </Button>
  )
}
