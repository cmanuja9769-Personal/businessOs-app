import { ReactNode } from "react"
import { Search } from "lucide-react"
import { CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface CardHeaderWithSearchProps {
  icon: ReactNode
  title: string
  mobileTitle?: string
  count: number
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  actions?: ReactNode
}

export function CardHeaderWithSearch({
  icon,
  title,
  mobileTitle,
  count,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  actions,
}: CardHeaderWithSearchProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
        <span className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">{icon}</span>
        <span className="hidden sm:inline">{title}</span>
        <span className="sm:hidden">{mobileTitle || title}</span>
        <span className="text-muted-foreground font-normal">({count})</span>
      </CardTitle>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            className="pl-9 w-full h-9 text-sm"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
        {actions}
      </div>
    </div>
  )
}
