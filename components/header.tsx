"use client"

import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-background border-b border-border">
      <div className="flex items-center justify-between px-6 py-3 gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="search" placeholder="Search customers, items, invoices..." className="pl-9 bg-muted/50" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
          </Button>

          <div className="flex items-center gap-3 pl-3 border-l border-border">
            <div className="text-right">
              <p className="text-sm font-medium">Admin User</p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
              <span className="text-sm font-medium text-primary-foreground">AU</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
