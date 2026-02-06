import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="h-full flex flex-col overflow-hidden px-4 sm:px-6 py-3 sm:py-4 space-y-3">
      <div className="space-y-1 shrink-0">
        <Skeleton className="h-7 sm:h-8 w-28 sm:w-32" />
        <Skeleton className="h-4 w-48 sm:w-64" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 shrink-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="py-3 px-4 pb-2">
              <Skeleton className="h-4 sm:h-5 w-24 sm:w-32" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Skeleton className="h-7 sm:h-8 w-20 sm:w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="py-3 px-4 shrink-0">
          <Skeleton className="h-5 sm:h-6 w-32 sm:w-40" />
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 flex-1 overflow-y-auto">
          <Skeleton className="h-64 sm:h-80 lg:h-96 w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  )
}
