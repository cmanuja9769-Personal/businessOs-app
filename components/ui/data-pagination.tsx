"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface DataPaginationProps {
  currentPage: number
  totalPages: number
  startIndex: number
  endIndex: number
  totalItems: number
  visiblePages: number[]
  canGoNext: boolean
  canGoPrevious: boolean
  onPageChange: (page: number) => void
  onNextPage: () => void
  onPreviousPage: () => void
  className?: string
  itemLabel?: string
}

export function DataPagination({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  visiblePages,
  canGoNext,
  canGoPrevious,
  onPageChange,
  onNextPage,
  onPreviousPage,
  className,
  itemLabel = "items",
}: DataPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className={cn(
      "flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t shrink-0",
      className
    )}>
      <div className="text-xs sm:text-sm text-muted-foreground">
        Showing <span className="font-semibold">{startIndex + 1}</span> to{" "}
        <span className="font-semibold">{Math.min(endIndex, totalItems)}</span> of{" "}
        <span className="font-semibold">{totalItems}</span> {itemLabel}
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={!canGoPrevious}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        <div className="flex items-center gap-1 flex-wrap justify-center">
          {visiblePages.map((page, idx) => (
            <div key={page} className="flex items-center gap-1">
              {idx > 0 && visiblePages[idx - 1] !== page - 1 && (
                <span className="text-muted-foreground">...</span>
              )}
              <Button
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page)}
                className="min-w-10"
              >
                {page}
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!canGoNext}
          className="gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
