import { LucideIcon } from "lucide-react"
import { CardTitle } from "@/components/ui/card"

interface CardTitleWithCountProps {
  icon: LucideIcon
  title: string
  mobileTitle?: string
  count: number
}

export function CardTitleWithCount({
  icon: Icon,
  title,
  mobileTitle,
  count,
}: CardTitleWithCountProps) {
  return (
    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      <span className="hidden sm:inline">{title}</span>
      <span className="sm:hidden">{mobileTitle || title}</span>
      <span className="text-muted-foreground font-normal">({count})</span>
    </CardTitle>
  )
}
