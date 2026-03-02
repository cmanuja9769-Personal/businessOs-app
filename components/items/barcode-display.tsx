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

const FONT_XS_6 = "text-[6px]"
const FONT_XS_55 = "text-[5.5px]"
const FONT_XS_5 = "text-[5px]"
const FONT_XS_8 = "text-[8px]"
const FONT_XS_9 = "text-[9px]"
const FONT_XS_7 = "text-[7px]"

function getBarcodeSizeForWidth(width: number) {
  if (width <= 40) {
    return { width: 1.2, height: 22, margin: 1 }
  }
  if (width <= 55) {
    return { width: 1.4, height: 28, margin: 2 }
  }
  if (width <= 75) {
    return { width: 1.5, height: 32, margin: 2 }
  }
  return { width: 1.8, height: 38, margin: 2 }
}

function getBarcodeValue(item: IItem) {
  if (item.barcodeNo && typeof item.barcodeNo === "string" && item.barcodeNo.trim()) {
    return item.barcodeNo.trim()
  }
  if (item.itemCode && typeof item.itemCode === "string" && item.itemCode.trim()) {
    return item.itemCode.trim()
  }
  return "0000000000000"
}

function getFontSizesForWidth(width: number) {
  if (width <= 40) {
    return { name: FONT_XS_6, hindi: FONT_XS_6, code: FONT_XS_5, barcode: FONT_XS_5, price: FONT_XS_7, cartonQty: FONT_XS_5 }
  }
  if (width <= 55) {
    return { name: FONT_XS_7, hindi: FONT_XS_7, code: FONT_XS_55, barcode: FONT_XS_55, price: FONT_XS_8, cartonQty: FONT_XS_55 }
  }
  if (width <= 75) {
    return { name: FONT_XS_8, hindi: FONT_XS_8, code: FONT_XS_6, barcode: FONT_XS_6, price: FONT_XS_9, cartonQty: FONT_XS_6 }
  }
  return { name: "text-[11px]", hindi: "text-xs", code: FONT_XS_9, barcode: FONT_XS_9, price: "text-[10px]", cartonQty: FONT_XS_9 }
}

function normalizeBarcodeQuantity(quantity: number | undefined) {
  const validQuantity = typeof quantity === "number" && !Number.isNaN(quantity) ? quantity : 1
  return {
    validQuantity,
    barcodesToPrint: Math.max(1, Math.min(10000, Math.floor(validQuantity))),
  }
}

function buildPages(placeholdersCount: number, barcodesToPrint: number, labelsPerPage: number) {
  const totalItems = placeholdersCount + barcodesToPrint
  const totalPages = Math.ceil(totalItems / labelsPerPage)
  const pages: Array<Array<{ type: "placeholder"; key: string } | { type: "label"; key: string; index: number }>> = []

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const pageItems: Array<{ type: "placeholder"; key: string } | { type: "label"; key: string; index: number }> = []
    const startIndex = pageIndex * labelsPerPage
    const endIndex = Math.min(startIndex + labelsPerPage, totalItems)

    for (let itemIndex = startIndex; itemIndex < endIndex; itemIndex++) {
      if (itemIndex < placeholdersCount) {
        pageItems.push({ type: "placeholder", key: `placeholder-${itemIndex}` })
      } else {
        const labelIndex = itemIndex - placeholdersCount
        pageItems.push({ type: "label", key: `label-${labelIndex}`, index: labelIndex })
      }
    }

    pages.push(pageItems)
  }

  return pages
}

function BarcodeCanvas({ value, layout }: BarcodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const currentLayout = layout || getDefaultLayout()
  const barcodeSize = getBarcodeSizeForWidth(currentLayout?.labelWidth || 70)

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
      const { width, height, margin } = barcodeSize

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
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        }
      }
    }
  }, [value, barcodeSize])

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

  const barcodeValue = getBarcodeValue(item)

  const { validQuantity, barcodesToPrint } = normalizeBarcodeQuantity(quantity)
  
  if (barcodesToPrint !== validQuantity) {
    console.warn(`[BarcodeDisplay] Quantity adjusted from ${validQuantity} to ${barcodesToPrint}`)
  }
  
  const currentLayout = layout || getDefaultLayout()

  const validStartPosition = validateStartPosition(startPosition, currentLayout)
  
  const placeholders = generatePlaceholderLabels(validStartPosition, currentLayout.totalLabels)
  const cssVars = getLayoutCSSVariables(currentLayout)

  if (!item.barcodeNo || !item.barcodeNo.trim()) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 space-y-3">
          <h3 className="text-lg font-semibold text-yellow-900">Barcode Not Available</h3>
          <p className="text-yellow-700">
            This item doesn&apos;t have a barcode yet. A barcode is generated for new items if left empty.
          </p>
        </div>
      </div>
    )
  }

  const fonts = getFontSizesForWidth(currentLayout?.labelWidth || 70)
  const itemName = item.name || 'Unnamed Item'

  const showCarton = !!(showPerCartonQty && item.perCartonQuantity && item.perCartonQuantity > 1)
  const showPriceBlock = !!(showPrice && currentLayout.labelHeight >= 35)
  const showFooter = showCarton || showPriceBlock
  const headerClamp = showFooter ? 'line-clamp-1' : 'line-clamp-2'

  const labelsPerPage = currentLayout.columns * currentLayout.rows
  const pages = buildPages(placeholders.length, barcodesToPrint, labelsPerPage)

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
