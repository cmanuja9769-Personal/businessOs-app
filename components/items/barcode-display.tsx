"use client"

import type { IItem } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { useEffect, useRef } from "react"
import JsBarcode from "jsbarcode"

interface BarcodeDisplayProps {
  item: IItem
  quantity?: number
  showPrice?: boolean
}

function BarcodeCanvas({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: false,
          margin: 10,
          background: "#ffffff",
          lineColor: "#000000",
        })
      } catch (error) {
        console.error("Barcode generation error:", error)
      }
    }
  }, [value])

  return <canvas ref={canvasRef} className="max-w-full" />
}

export function BarcodeDisplay({ item, quantity = 1, showPrice = false }: BarcodeDisplayProps) {
  const barcodeValue = item.barcodeNo && item.barcodeNo.trim() ? item.barcodeNo : item.itemCode || "0000000000000"
  const barcodesToPrint = Math.max(1, quantity)

  if (!item.barcodeNo || !item.barcodeNo.trim()) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 space-y-3">
          <h3 className="text-lg font-semibold text-yellow-900">Barcode Not Available</h3>
          <p className="text-yellow-700">
            This item doesn't have a barcode yet. Please run the database migration to add barcode support.
          </p>
          <div className="bg-white rounded p-4 text-left text-sm space-y-2">
            <p className="font-semibold text-gray-900">To fix this:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Go to your Supabase Dashboard → SQL Editor</li>
              <li>Run the migration script: <code className="bg-gray-100 px-2 py-0.5 rounded">scripts/010_add_barcode_column.sql</code></li>
              <li>Refresh this page</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-4">
      {[...Array(barcodesToPrint)].map((_, index) => (
        <Card key={index} className="print:break-inside-avoid">
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className="text-center font-semibold text-sm line-clamp-2">{item.name}</p>
              {item.itemCode && (
                <p className="text-center text-xs text-muted-foreground font-mono">
                  {item.itemCode}
                </p>
              )}
              <div className="flex justify-center py-2">
                <BarcodeCanvas value={barcodeValue} />
              </div>
              <p className="text-center text-xs font-mono text-muted-foreground">
                {barcodeValue}
              </p>
              {showPrice && (
                <div className="text-center space-y-1 pt-2 border-t">
                  <p className="text-xl font-bold">₹{item.salePrice.toFixed(2)}</p>
                  {item.mrp && item.mrp > item.salePrice && (
                    <p className="text-xs text-muted-foreground line-through">MRP: ₹{item.mrp.toFixed(2)}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
