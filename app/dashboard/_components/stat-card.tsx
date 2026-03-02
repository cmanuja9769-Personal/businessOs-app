import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  readonly title: string
  readonly icon: LucideIcon
  readonly iconColor: string
  readonly iconBg: string
  readonly gradientFrom: string
  readonly value: string
  readonly valueColor: string
  readonly subtitle: string
  readonly loading: boolean
}

export function StatCard({
  title,
  icon: Icon,
  iconColor,
  iconBg,
  gradientFrom,
  value,
  valueColor,
  subtitle,
  loading,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} to-transparent`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 relative">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-1.5 rounded-full ${iconBg}`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 relative">
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <>
            <div className={`text-xl sm:text-2xl font-bold truncate ${valueColor}`}>{value}</div>
            <p className="text-[0.625rem] text-muted-foreground truncate">{subtitle}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
