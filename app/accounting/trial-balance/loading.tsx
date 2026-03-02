import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-4">
      <div className="space-y-1">
        <Skeleton className="h-6 sm:h-7 w-32 sm:w-40" />
        <Skeleton className="h-3 sm:h-4 w-48 sm:w-64" />
      </div>
      <Card>
        <CardHeader className="py-3 px-4">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
