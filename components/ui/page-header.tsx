import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ 
  title, 
  description, 
  actions,
  className 
}: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0",
      className
    )}>
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-row gap-2 w-full sm:w-auto flex-wrap">
          {actions}
        </div>
      )}
    </div>
  )
}
