import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-4 sm:space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-6 sm:h-7 w-24 sm:w-28" />
        <Skeleton className="h-3 sm:h-4 w-48 sm:w-64" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="py-3 px-4">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
