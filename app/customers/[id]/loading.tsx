import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-6 sm:h-8 w-36 sm:w-48" />
            <Skeleton className="h-3 sm:h-4 w-48 sm:w-64" />
          </div>
        </div>
        <Skeleton className="h-9 sm:h-10 w-full sm:w-32" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2 sm:pb-3">
              <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 sm:h-8 w-24 sm:w-32 mb-2" />
              <Skeleton className="h-3 w-16 sm:w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <Skeleton className="h-5 sm:h-6 w-28 sm:w-32" />
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 sm:h-12 w-full" />
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 sm:h-6 w-28 sm:w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 sm:h-20 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
