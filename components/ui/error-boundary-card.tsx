"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

interface ErrorBoundaryProps {
  readonly error: Error & { digest?: string }
  readonly reset: () => void
  readonly title?: string
}

export function ErrorBoundaryCard({ error, reset, title = "Something went wrong" }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[24rem]">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-2" />
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred while loading this page."}
          </p>
          <Button onClick={reset}>Try again</Button>
        </CardContent>
      </Card>
    </div>
  )
}
