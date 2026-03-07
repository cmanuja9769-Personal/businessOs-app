import { GlassCard } from "@/components/ui/glass-card"
import { Skeleton } from "@/components/ui/skeleton"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  readonly title: string
  readonly icon: LucideIcon
  readonly iconColor: string
  readonly iconBg: string
  readonly accentColor: string
  readonly value: string
  readonly valueColor: string
  readonly subtitle: string
  readonly loading: boolean
  readonly className?: string
}

export function StatCard({
  title,
  icon: Icon,
  iconColor,
  iconBg,
  accentColor,
  value,
  valueColor,
  subtitle,
  loading,
  className,
}: StatCardProps) {
  return (
    <GlassCard
      glow
      className={cn(
        "relative overflow-hidden group",
        className
      )}
    >
      <div
        className={cn(
          "absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-[0.07] blur-2xl transition-opacity duration-500 group-hover:opacity-[0.12]",
          accentColor
        )}
      />
      <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[0.6875rem] font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          {loading ? (
            <Skeleton className="h-7 w-24 rounded-lg" />
          ) : (
            <>
              <div className={cn("text-xl sm:text-2xl font-bold truncate animate-number-tick", valueColor)}>
                {value}
              </div>
              <p className="text-[0.6875rem] text-muted-foreground/80 truncate">{subtitle}</p>
            </>
          )}
        </div>
        <div className={cn("p-2 rounded-2xl neo-inset flex-shrink-0", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </div>
    </GlassCard>
  )
}
