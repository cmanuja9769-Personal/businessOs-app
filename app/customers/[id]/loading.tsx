import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="h-full flex flex-col overflow-hidden px-4 sm:px-6 py-3 sm:py-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded" />
          <div className="space-y-1">
            <Skeleton className="h-6 sm:h-8 w-36 sm:w-48" />
            <Skeleton className="h-3 sm:h-4 w-48 sm:w-64" />
          </div>
        </div>
        <Skeleton className="h-9 sm:h-10 w-full sm:w-32" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="py-2 px-4 pb-2">
              <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <Skeleton className="h-6 sm:h-8 w-24 sm:w-32 mb-2" />
              <Skeleton className="h-3 w-16 sm:w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3 overflow-hidden">
        <Card className="lg:col-span-1 flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4 shrink-0">
            <Skeleton className="h-5 sm:h-6 w-28 sm:w-32" />
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 flex-1 overflow-y-auto space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 sm:h-12 w-full" />
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4 shrink-0">
            <Skeleton className="h-5 sm:h-6 w-28 sm:w-32" />
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 flex-1 overflow-y-auto space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 sm:h-20 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
