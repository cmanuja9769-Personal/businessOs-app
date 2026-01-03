"use client"

import type { IItem } from "@/types"
import { useEffect, useRef } from "react"
import JsBarcode from "jsbarcode"
import { 
  type LabelLayout, 
  getDefaultLayout, 
  generatePlaceholderLabels, 
  getLayoutCSSVariables,
  validateStartPosition 
} from "@/lib/label-layouts"

interface BarcodeDisplayProps {
  item: IItem
  quantity?: number
  showPrice?: boolean
  showPerCartonQty?: boolean
  layout?: LabelLayout
  startPosition?: number
}

interface BarcodeCanvasProps {
  value: string
  layout?: LabelLayout
}

function BarcodeCanvas({ value, layout }: BarcodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const currentLayout = layout || getDefaultLayout()

  // Adjust barcode size based on label size with validation
  const getBarcodeSize = () => {
    const width = currentLayout?.labelWidth || 70
    
    if (width <= 40) {
      return { width: 1.5, height: 30, margin: 3 }
    } else if (width <= 55) {
      return { width: 1.8, height: 40, margin: 4 }
    } else if (width <= 75) {
      return { width: 2, height: 50, margin: 5 }
    } else {
      return { width: 2.5, height: 60, margin: 6 }
    }
  }

  useEffect(() => {
    if (!canvasRef.current) {
      console.warn('[BarcodeCanvas] Canvas ref not available')
      return
    }
    
    if (!value || typeof value !== 'string' || value.trim() === '') {
      console.warn('[BarcodeCanvas] Invalid or empty barcode value')
      return
    }
    
    try {
      const { width, height, margin } = getBarcodeSize()
      
      // Validate barcode value before generation
      const cleanValue = value.trim()
      if (cleanValue.length === 0 || cleanValue.length > 80) {
        console.error(`[BarcodeCanvas] Invalid barcode length: ${cleanValue.length}`)
        return
      }
      
      JsBarcode(canvasRef.current, cleanValue, {
        format: "CODE128",
        width: Math.max(1, width),
        height: Math.max(20, height),
        displayValue: false,
        margin: Math.max(0, margin),
        background: "#ffffff",
        lineColor: "#000000",
        valid: (valid) => {
          if (!valid) {
            console.error(`[BarcodeCanvas] Invalid barcode format: ${cleanValue}`)
          }
        }
      })
    } catch (error) {
      console.error("[BarcodeCanvas] Barcode generation error:", error)
      // Clear canvas on error
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        }
      }
    }
  }, [value, currentLayout])

  return <canvas ref={canvasRef} className="max-w-full" aria-label="Barcode" />
}

export function BarcodeDisplay({ 
  item, 
  quantity = 1, 
  showPrice = false,
  showPerCartonQty = false,
  layout,
  startPosition = 1
}: BarcodeDisplayProps) {
  // Validate item
  if (!item || typeof item !== 'object') {
    console.error('[BarcodeDisplay] Invalid item provided')
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600 font-semibold">Error: Invalid item data</p>
        </div>
      </div>
    )
  }
  
  // Validate and sanitize barcode value
  const getBarcodeValue = () => {
    if (item.barcodeNo && typeof item.barcodeNo === 'string' && item.barcodeNo.trim()) {
      return item.barcodeNo.trim()
    }
    if (item.itemCode && typeof item.itemCode === 'string' && item.itemCode.trim()) {
      return item.itemCode.trim()
    }
    return "0000000000000" // Fallback value
  }
  
  const barcodeValue = getBarcodeValue()
  
  // Validate and clamp quantity
  const validQuantity = typeof quantity === 'number' && !isNaN(quantity) ? quantity : 1
  const barcodesToPrint = Math.max(1, Math.min(10000, Math.floor(validQuantity)))
  
  if (barcodesToPrint !== validQuantity) {
    console.warn(`[BarcodeDisplay] Quantity adjusted from ${validQuantity} to ${barcodesToPrint}`)
  }
  
  // Validate layout
  const currentLayout = layout || getDefaultLayout()
  
  // Validate start position
  const validStartPosition = validateStartPosition(startPosition, currentLayout)
  
  const placeholders = generatePlaceholderLabels(validStartPosition, currentLayout.totalLabels)
  const cssVars = getLayoutCSSVariables(currentLayout)

  if (!item.barcodeNo || !item.barcodeNo.trim()) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 space-y-3">
          <h3 className="text-lg font-semibold text-yellow-900">Barcode Not Available</h3>
          <p className="text-yellow-700">
            This item doesn't have a barcode yet. The system will auto-generate one during bulk upload if left empty.
          </p>
        </div>
      </div>
    )
  }

  // Determine font sizes based on label size
  const getFontSizes = () => {
    const width = currentLayout?.labelWidth || 70
    
    if (width <= 40) {
      return { name: 'text-[6px]', code: 'text-[5px]', barcode: 'text-[5px]', price: 'text-[8px]', mrp: 'text-[5px]', cartonQty: 'text-[5px]' }
    } else if (width <= 55) {
      return { name: 'text-[8px]', code: 'text-[6px]', barcode: 'text-[6px]', price: 'text-xs', mrp: 'text-[6px]', cartonQty: 'text-[6px]' }
    } else if (width <= 75) {
      return { name: 'text-[10px]', code: 'text-[7px]', barcode: 'text-[7px]', price: 'text-sm', mrp: 'text-[7px]', cartonQty: 'text-[7px]' }
    } else {
      return { name: 'text-xs', code: 'text-[8px]', barcode: 'text-[8px]', price: 'text-base', mrp: 'text-xs', cartonQty: 'text-[8px]' }
    }
  }

  const fonts = getFontSizes()
  const itemName = item.name || 'Unnamed Item'

  return (
    <div 
      className="barcode-label-grid"
      style={cssVars as React.CSSProperties}
    >
      {/* Placeholder labels for start position offset */}
      {placeholders.map((_, index) => (
        <div key={`placeholder-${index}`} className="barcode-label barcode-label-placeholder" />
      ))}
      
      {/* Actual barcode labels */}
      {[...Array(barcodesToPrint)].map((_, index) => (
        <div key={`label-${index}`} className="barcode-label">
          <div className="barcode-label-content">
            <p className={`text-center font-semibold line-clamp-2 ${fonts.name}`}>{itemName}</p>
            {item.itemCode && currentLayout.labelHeight >= 35 && (
              <p className={`text-center text-muted-foreground font-mono ${fonts.code}`}>
                {item.itemCode}
              </p>
            )}
            <div className="flex justify-center py-1">
              <BarcodeCanvas value={barcodeValue} layout={currentLayout} />
            </div>
            <p className={`text-center font-mono text-muted-foreground ${fonts.barcode}`}>
              {barcodeValue}
            </p>
            {showPrice && currentLayout.labelHeight >= 35 && (
              <div className="text-center space-y-0.5 pt-1 border-t">
                <p className={`font-bold ${fonts.price}`}>
                  ₹{(typeof item.salePrice === 'number' && !isNaN(item.salePrice) ? item.salePrice : 0).toFixed(2)}
                </p>
                {item.mrp && typeof item.mrp === 'number' && !isNaN(item.mrp) && item.mrp > (item.salePrice || 0) && (
                  <p className={`text-muted-foreground line-through ${fonts.mrp}`}>
                    MRP: ₹{item.mrp.toFixed(2)}
                  </p>
                )}
              </div>
            )}
            {showPerCartonQty && item.perCartonQuantity && item.perCartonQuantity > 1 && (
              <p className={`text-center font-medium text-blue-600 ${fonts.cartonQty}`}>
                {item.perCartonQuantity} pcs/carton
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
