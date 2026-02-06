import type { ReactNode } from "react"
import { CardTitle } from "@/components/ui/card"

interface CardTitleWithCountProps {
  icon: ReactNode
  title: string
  mobileTitle?: string
  count: number
}

export function CardTitleWithCount({
  icon,
  title,
  mobileTitle,
  count,
}: CardTitleWithCountProps) {
  return (
    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
      <span className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">{icon}</span>
      <span className="hidden sm:inline">{title}</span>
      <span className="sm:hidden">{mobileTitle || title}</span>
      <span className="text-muted-foreground font-normal">({count})</span>
    </CardTitle>
  )
}
