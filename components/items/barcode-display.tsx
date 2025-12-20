"use client"

import type { IItem } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { useEffect, useRef } from "react"

interface BarcodeDisplayProps {
  item: IItem
}

export function BarcodeDisplay({ item }: BarcodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Simple barcode generation (Code 128 style visualization)
      const barcodeValue = item.barcodeNo || item.id
      const barWidth = 3
      const barHeight = 80
      const padding = 20

      // Calculate canvas size
      canvas.width = barcodeValue.length * barWidth * 2 + padding * 2
      canvas.height = barHeight + padding * 2 + 40

      // Clear canvas
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw bars (simplified barcode representation)
      ctx.fillStyle = "#000000"
      let x = padding

      for (let i = 0; i < barcodeValue.length; i++) {
        const charCode = barcodeValue.charCodeAt(i)
        if (charCode % 2 === 0) {
          ctx.fillRect(x, padding, barWidth, barHeight)
        }
        x += barWidth * 2
      }

      // Draw text
      ctx.font = "14px monospace"
      ctx.textAlign = "center"
      ctx.fillText(barcodeValue, canvas.width / 2, barHeight + padding + 20)
    }
  }, [item])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-4">
      {[...Array(12)].map((_, index) => (
        <Card key={index} className="print:break-inside-avoid">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-center font-semibold text-sm">{item.name}</p>
              <div className="flex justify-center">
                <canvas ref={index === 0 ? canvasRef : undefined} className="max-w-full" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-bold">₹{item.salePrice.toFixed(2)}</p>
                {item.mrp && item.mrp > item.salePrice && (
                  <p className="text-xs text-muted-foreground line-through">MRP: ₹{item.mrp.toFixed(2)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
