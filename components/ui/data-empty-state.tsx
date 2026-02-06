import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface DataEmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function DataEmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className 
}: DataEmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 text-center",
      className
    )}>
      <div className="w-12 h-12 text-muted-foreground mb-4 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      {action}
    </div>
  )
}
