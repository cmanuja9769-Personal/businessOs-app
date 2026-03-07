import Link from "next/link"
import { GlassCard } from "@/components/ui/glass-card"
import { Plus, ShoppingCart, Users, Package, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

const actions = [
  { href: "/invoices/new", icon: Plus, label: "Invoice", color: "text-emerald-600", bg: "bg-emerald-500/10" },
  { href: "/purchases/new", icon: ShoppingCart, label: "Purchase", color: "text-sky-600", bg: "bg-sky-500/10" },
  { href: "/customers", icon: Users, label: "Customer", color: "text-violet-600", bg: "bg-violet-500/10" },
  { href: "/items", icon: Package, label: "Item", color: "text-amber-600", bg: "bg-amber-500/10" },
  { href: "/reports", icon: BarChart3, label: "Reports", color: "text-rose-600", bg: "bg-rose-500/10" },
] as const

export function QuickActions() {
  return (
    <GlassCard intensity="subtle" className="p-3">
      <div className="flex items-center justify-around gap-1">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 min-w-[3.5rem]"
          >
            <div className={cn("p-2.5 rounded-2xl neo-inset", action.bg)}>
              <action.icon className={cn("h-4 w-4", action.color)} />
            </div>
            <span className="text-[0.625rem] font-medium text-muted-foreground">{action.label}</span>
          </Link>
        ))}
      </div>
    </GlassCard>
  )
}
