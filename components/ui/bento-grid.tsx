import * as React from "react"
import { cn } from "@/lib/utils"

type BentoSpan = "1x1" | "2x1" | "1x2" | "2x2"

const spanMap: Record<BentoSpan, string> = {
  "1x1": "bento-1x1",
  "2x1": "bento-2x1",
  "1x2": "bento-1x2",
  "2x2": "bento-2x2",
}

type BentoGridProps = React.ComponentProps<"div">

function BentoGrid({ className, ...props }: BentoGridProps) {
  return <div className={cn("bento-grid", className)} {...props} />
}

interface BentoTileProps extends React.ComponentProps<"div"> {
  readonly span?: BentoSpan
}

function BentoTile({ className, span = "1x1", ...props }: BentoTileProps) {
  return (
    <div
      className={cn("bento-tile", spanMap[span], className)}
      {...props}
    />
  )
}

export { BentoGrid, BentoTile }
