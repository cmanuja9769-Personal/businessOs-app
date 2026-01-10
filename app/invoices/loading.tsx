import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 sm:h-8 w-28 sm:w-32" />
          <Skeleton className="h-4 w-48 sm:w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 sm:h-10 w-full sm:w-32" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <Skeleton className="h-5 sm:h-6 w-20 sm:w-24" />
            <Skeleton className="h-9 sm:h-10 w-full sm:flex-1 sm:max-w-sm" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3 sm:p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-5 w-24 sm:w-32" />
                <Skeleton className="h-5 w-16 sm:w-20" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
