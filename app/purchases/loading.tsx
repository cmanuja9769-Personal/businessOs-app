import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function PurchasesLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 sm:h-9 w-32 sm:w-48" />
          <Skeleton className="h-4 sm:h-5 w-48 sm:w-72 lg:w-96" />
        </div>
        <Skeleton className="h-9 sm:h-10 w-full sm:w-40" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <Skeleton className="h-5 sm:h-6 w-32 sm:w-48" />
            <Skeleton className="h-9 sm:h-10 w-full sm:w-64 lg:w-80" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 sm:h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
