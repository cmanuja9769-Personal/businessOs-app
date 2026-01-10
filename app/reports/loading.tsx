import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 sm:h-8 w-28 sm:w-32" />
        <Skeleton className="h-4 w-48 sm:w-64" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 sm:h-5 w-24 sm:w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 sm:h-8 w-20 sm:w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 sm:h-6 w-32 sm:w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 sm:h-80 lg:h-96 w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  )
}
