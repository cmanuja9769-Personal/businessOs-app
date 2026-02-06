import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 h-full flex flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="space-y-1">
          <Skeleton className="h-6 sm:h-7 w-36 sm:w-44" />
          <Skeleton className="h-3 sm:h-4 w-48 sm:w-64" />
        </div>
        <div className="flex flex-row gap-2 w-full sm:w-auto">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="py-3 px-4 shrink-0">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-28" />
            <div className="flex flex-col sm:flex-row gap-2">
              <Skeleton className="h-9 w-full sm:flex-1" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden px-4 pb-4 pt-0">
          {/* Mobile card view */}
          <div className="space-y-2 md:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-12" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-20" />
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table view */}
          <div className="hidden md:block space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2 border-b last:border-0">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-7 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
