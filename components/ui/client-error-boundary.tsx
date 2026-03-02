"use client"

import type { ReactNode } from "react"
import { ErrorBoundary, type FallbackProps } from "react-error-boundary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface ClientErrorBoundaryProps {
  readonly children: ReactNode
  readonly fallbackTitle?: string
}

function ErrorFallback({ error, resetErrorBoundary, title }: FallbackProps & { readonly title?: string }) {
  const message = error instanceof Error ? error.message : "An unexpected error occurred while rendering this section."
  return (
    <Card className="border-destructive/50">
      <CardHeader className="text-center pb-2">
        <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <CardTitle className="text-base">
          {title || "Something went wrong"}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          {message}
        </p>
        <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Try again
        </Button>
      </CardContent>
    </Card>
  )
}

export function ClientErrorBoundary({ children, fallbackTitle }: ClientErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallbackRender={(props) => <ErrorFallback {...props} title={fallbackTitle} />}
      onError={(error, info) => {
        console.error("[ClientErrorBoundary]", error, info.componentStack)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
