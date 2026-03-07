import * as React from "react"
import { cn } from "@/lib/utils"

type GlassIntensity = "subtle" | "default" | "strong"

const glassMap: Record<GlassIntensity, string> = {
  subtle: "glass-subtle",
  default: "glass",
  strong: "glass-strong",
}

interface GlassCardProps extends React.ComponentProps<"div"> {
  readonly intensity?: GlassIntensity
  readonly glow?: boolean
}

function GlassCard({
  className,
  intensity = "default",
  glow = false,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl p-4 neo-shadow-sm",
        glassMap[intensity],
        glow && "tile-glow",
        className
      )}
      {...props}
    />
  )
}

function GlassCardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center justify-between gap-2 pb-2", className)}
      {...props}
    />
  )
}

function GlassCardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "text-sm font-semibold leading-none tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  )
}

function GlassCardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("pt-0", className)} {...props} />
}

export { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent }
