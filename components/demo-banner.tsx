"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, LogOut, UserPlus } from "lucide-react"

export function DemoBanner() {
  const [visible, setVisible] = useState(() => {
    if (typeof document === "undefined") return false
    return document.cookie.includes("businessos_demo=1")
  })

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-amber-300/50 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/90 print:hidden">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">You are in demo mode — changes will not be saved.</span>
          <span className="sm:hidden">Demo mode (read-only)</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Up Free</span>
            <span className="sm:hidden">Sign Up</span>
          </Link>
          <Link
            href="/demo/exit"
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-200 dark:border-amber-500/30 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900/70"
          >
            <LogOut className="h-3.5 w-3.5" />
            Exit Demo
          </Link>
        </div>
      </div>
    </div>
  )
}
