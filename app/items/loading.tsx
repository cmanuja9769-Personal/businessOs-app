import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 sm:h-8 w-36 sm:w-44" />
          <Skeleton className="h-4 w-48 sm:w-64" />
        </div>
        <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto flex-wrap">
          <Skeleton className="h-9 sm:h-10 w-full xs:w-24 sm:w-28" />
          <Skeleton className="h-9 sm:h-10 w-full xs:w-24 sm:w-28" />
          <Skeleton className="h-9 sm:h-10 w-full xs:w-24 sm:w-28" />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-5 sm:h-6 w-24 sm:w-32" />
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Skeleton className="h-9 sm:h-10 w-full sm:flex-1" />
              <div className="flex gap-2">
                <Skeleton className="h-9 sm:h-10 w-20 sm:w-24" />
                <Skeleton className="h-9 sm:h-10 w-20 sm:w-24" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile card view */}
          <div className="space-y-3 sm:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-16" />
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table view */}
          <div className="hidden sm:block space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b last:border-0">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
