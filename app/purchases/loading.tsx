import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function PurchasesLoading() {
  return (
    <div className="h-full flex flex-col overflow-hidden px-4 sm:px-6 py-3 sm:py-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="space-y-1">
          <Skeleton className="h-7 sm:h-9 w-32 sm:w-48" />
          <Skeleton className="h-4 sm:h-5 w-48 sm:w-72 lg:w-96" />
        </div>
        <Skeleton className="h-9 sm:h-10 w-full sm:w-40" />
      </div>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="py-3 px-4 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Skeleton className="h-5 sm:h-6 w-32 sm:w-48" />
            <Skeleton className="h-9 sm:h-10 w-full sm:w-64 lg:w-80" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 flex-1 overflow-y-auto">
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-40" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table view */}
          <div className="hidden md:block space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b last:border-0">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 flex-1 max-w-xs" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
