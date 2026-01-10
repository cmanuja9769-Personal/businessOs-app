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
  hindiName?: string
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
  startPosition = 1,
  hindiName,
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
            This item doesn't have a barcode yet. A barcode is generated for new items if left empty.
          </p>
        </div>
      </div>
    )
  }

  // Determine font sizes based on label size
  const getFontSizes = () => {
    const width = currentLayout?.labelWidth || 70
    
    if (width <= 40) {
      return { name: 'text-[6px]', hindi: 'text-[6px]', code: 'text-[5px]', barcode: 'text-[5px]', price: 'text-[7px]', cartonQty: 'text-[5px]' }
    } else if (width <= 55) {
      return { name: 'text-[7px]', hindi: 'text-[7px]', code: 'text-[5.5px]', barcode: 'text-[5.5px]', price: 'text-[8px]', cartonQty: 'text-[5.5px]' }
    } else if (width <= 75) {
      return { name: 'text-[8px]', hindi: 'text-[8px]', code: 'text-[6px]', barcode: 'text-[6px]', price: 'text-[9px]', cartonQty: 'text-[6px]' }
    } else {
      return { name: 'text-[11px]', hindi: 'text-xs', code: 'text-[9px]', barcode: 'text-[9px]', price: 'text-[10px]', cartonQty: 'text-[9px]' }
    }
  }

  const fonts = getFontSizes()
  const itemName = item.name || 'Unnamed Item'

  const showCarton = !!(showPerCartonQty && item.perCartonQuantity && item.perCartonQuantity > 1)
  const showPriceBlock = !!(showPrice && currentLayout.labelHeight >= 35)
  const showFooter = showCarton || showPriceBlock
  const headerClamp = showFooter ? 'line-clamp-1' : 'line-clamp-2'

  // Pagination logic
  const labelsPerPage = currentLayout.columns * currentLayout.rows
  const totalItems = placeholders.length + barcodesToPrint
  const totalPages = Math.ceil(totalItems / labelsPerPage)
  
  const pages = []
  for (let i = 0; i < totalPages; i++) {
    const pageItems = []
    const startIndex = i * labelsPerPage
    const endIndex = Math.min(startIndex + labelsPerPage, totalItems)
    
    for (let j = startIndex; j < endIndex; j++) {
      if (j < placeholders.length) {
        pageItems.push({ type: 'placeholder', key: `placeholder-${j}` })
      } else {
        const labelIndex = j - placeholders.length
        pageItems.push({ type: 'label', key: `label-${labelIndex}`, index: labelIndex })
      }
    }
    pages.push(pageItems)
  }

  return (
    <div>
      {pages.map((pageItems, pageIndex) => (
        <div 
          key={`page-${pageIndex}`}
          className={`print-page barcode-label-page ${pageIndex < pages.length - 1 ? 'barcode-page-break' : ''}`}
          style={pageIndex > 0 ? { breakBefore: 'page', pageBreakBefore: 'always' } : undefined}
        >
          <div 
            className="barcode-label-grid"
            style={cssVars as React.CSSProperties}
          >
            {pageItems.map(pageItem => {
            if (pageItem.type === 'placeholder') {
              return <div key={pageItem.key} className="barcode-label barcode-label-placeholder" />
            }
            
            return (
              <div key={pageItem.key} className="barcode-label">
                <div className="barcode-label-content">
                  <p className={`text-center font-semibold ${headerClamp} ${fonts.name}`}>{itemName}</p>
                  {hindiName && (
                    <p className={`text-center font-bold text-black ${headerClamp} ${fonts.hindi}`}>{hindiName}</p>
                  )}
                  {item.itemCode && currentLayout.labelHeight >= 35 && (
                    <p className={`text-center text-muted-foreground font-mono font-bold ${fonts.code}`}>
                      {item.itemCode}
                    </p>
                  )}
                  <div className="flex flex-col items-center justify-center py-1">
                    <BarcodeCanvas value={barcodeValue} layout={currentLayout} />
                    <p className={`text-center font-mono text-muted-foreground mt-1 ${fonts.barcode}`}>{barcodeValue}</p>
                  </div>

                  {showFooter && (
                    <div className="flex items-center justify-between gap-1 pt-1 border-t">
                      <div>
                        {showPriceBlock && (
                          <span className={`font-bold ${fonts.price}`}>
                            ₹{(typeof item.salePrice === 'number' && !isNaN(item.salePrice) ? item.salePrice : 0).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2 whitespace-nowrap">
                        {showCarton && (
                          <span className={`font-bold text-black ${fonts.cartonQty}`}>
                            {item.perCartonQuantity}{item.unit || 'PCS'}/{item.packagingUnit || 'CTN'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          </div>
        </div>
      ))}
    </div>
  )
}
