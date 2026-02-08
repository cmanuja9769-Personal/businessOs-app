"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TableProps extends React.ComponentProps<"table"> {
  containerClassName?: string
}

function Table({ className, containerClassName, ...props }: TableProps) {
  return (
    <div 
      data-slot="table-container" 
      className={cn(
        "relative w-full overflow-auto rounded-lg border scrollbar-hide",
        containerClassName
      )}
    >
      {/* eslint-disable-next-line sonarjs/table-header -- headers provided by consumer via TableHeader/TableHead children */}
      <table 
        role="table"
        aria-label="Data table"
        data-slot="table" 
        className={cn("w-full caption-bottom text-xs sm:text-sm", className)} 
        {...props} 
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead 
      data-slot="table-header" 
      className={cn("[&_tr]:border-b bg-muted sticky top-0 z-10", className)} 
      {...props} 
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("bg-muted/50 border-t font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors", className)}
      {...props}
    />
  )
}

interface TableHeadProps extends React.ComponentProps<"th"> {
  resizable?: boolean
}

function TableHead({ className, resizable, style, ...props }: TableHeadProps) {
  const [isResizing, setIsResizing] = React.useState(false)
  const [width, setWidth] = React.useState<number | undefined>(undefined)
  const thRef = React.useRef<HTMLTableCellElement>(null)

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (!resizable) return
    e.preventDefault()
    setIsResizing(true)
    
    const startX = e.clientX
    const startWidth = thRef.current?.offsetWidth || 100

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(50, startWidth + (e.clientX - startX))
      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [resizable])

  return (
    <th
      ref={thRef}
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 sm:px-3 text-left align-middle font-semibold whitespace-nowrap [&:has([role=checkbox])]:pr-0 *:[[role=checkbox]]:translate-y-0.5 relative select-none",
        resizable && "pr-4",
        isResizing && "cursor-col-resize",
        className,
      )}
      style={{ ...style, width: width ? `${width}px` : style?.width }}
      {...props}
    >
      {props.children}
      {resizable && (
        <div
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary"
          onMouseDown={handleMouseDown}
        />
      )}
    </th>
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 sm:p-3 align-middle text-xs sm:text-sm [&:has([role=checkbox])]:pr-0 *:[[role=checkbox]]:translate-y-0.5 truncate",
        className,
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption data-slot="table-caption" className={cn("text-muted-foreground mt-4 text-sm", className)} {...props} />
  )
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
