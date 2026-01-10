import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function SuppliersLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 sm:h-8 w-28 sm:w-32" />
          <Skeleton className="h-4 w-48 sm:w-64" />
        </div>
        <Skeleton className="h-9 sm:h-10 w-full sm:w-40" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <Skeleton className="h-5 sm:h-6 w-20 sm:w-24" />
            <Skeleton className="h-9 sm:h-10 w-full sm:flex-1 sm:max-w-sm" />
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile card view */}
          <div className="space-y-3 sm:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-6 w-6 rounded" />
                </div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
          {/* Desktop table view */}
          <div className="hidden sm:block space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b last:border-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 flex-1 max-w-xs" />
                <Skeleton className="h-4 w-32" />
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
