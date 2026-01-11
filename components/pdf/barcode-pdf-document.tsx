"use client"

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer"
import type { IItem } from "@/types"
import type { LabelLayout } from "@/lib/label-layouts"
import JsBarcode from "jsbarcode"

// Register font that supports Hindi
Font.register({
  family: "NotoSans",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans/files/noto-sans-all-400-normal.woff",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans/files/noto-sans-all-700-normal.woff",
      fontWeight: 700,
    },
  ],
})

interface BarcodePDFDocumentProps {
  item: IItem
  quantity: number
  layout: LabelLayout
  startPosition?: number
  showPrice?: boolean
  showPerCartonQty?: boolean
  hindiName?: string
}

// Convert mm to points (1mm = 2.83465 points)
const mmToPt = (mm: number) => mm * 2.83465

const generateBarcodeDataURL = (value: string, labelWidth: number): string => {
  if (typeof window === "undefined") return ""
  
  const canvas = document.createElement("canvas")
  try {
    // Adjust barcode size based on label width - MATCH HTML PREVIEW
    let barcodeWidth = 2
    let barcodeHeight = 50
    let margin = 5
    
    if (labelWidth <= 40) {
      barcodeWidth = 1.5
      barcodeHeight = 30
      margin = 3
    } else if (labelWidth <= 55) {
      barcodeWidth = 1.8
      barcodeHeight = 40
      margin = 4
    } else if (labelWidth <= 75) {
      barcodeWidth = 2
      barcodeHeight = 50
      margin = 5
    } else {
      barcodeWidth = 2.5
      barcodeHeight = 60
      margin = 6
    }
    
    JsBarcode(canvas, value, {
      format: "CODE128",
      width: barcodeWidth,
      height: barcodeHeight,
      displayValue: false,
      margin: margin,
      background: "#ffffff",
      lineColor: "#000000",
    })
    return canvas.toDataURL("image/png")
  } catch (e) {
    console.error("Barcode generation failed:", e)
    return ""
  }
}

export function BarcodePDFDocument({
  item,
  quantity,
  layout,
  startPosition = 1,
  showPrice = false,
  showPerCartonQty = false,
  hindiName,
}: BarcodePDFDocumentProps) {
  const barcodeValue = item.barcodeNo || item.itemCode || "0000000000000"
  const itemName = item.name || "Unnamed Item"
  const barcodeImg = generateBarcodeDataURL(barcodeValue, layout.labelWidth)

  // Calculate pagination with intelligent grid sizing
  const labelsPerPage = layout.columns * layout.rows
  const placeholderCount = Math.max(0, startPosition - 1)
  const totalSlots = placeholderCount + quantity
  const totalPages = Math.ceil(totalSlots / labelsPerPage)
  const totalSlotsNeeded = placeholderCount + quantity

  // Build pages with optimized row count
  const pages: Array<Array<{ type: "placeholder" | "label"; index: number }>> = []
  let currentSlot = 0

  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const pageItems: Array<{ type: "placeholder" | "label"; index: number }> = []
    // Calculate rows for this specific page - only create rows needed for remaining labels
    const remainingSlots = totalSlotsNeeded - currentSlot
    const rowsThisPage = Math.min(
      Math.ceil(remainingSlots / layout.columns),
      layout.rows
    )
    const itemsThisPage = rowsThisPage * layout.columns

    for (let i = 0; i < itemsThisPage && currentSlot < totalSlotsNeeded; i++) {
      if (currentSlot < placeholderCount) {
        pageItems.push({ type: "placeholder", index: currentSlot })
      } else {
        pageItems.push({ type: "label", index: currentSlot - placeholderCount })
      }
      currentSlot++
    }
    pages.push(pageItems)
  }

  // Convert all dimensions from mm to points
  // NOTE: Some provided layouts exceed A4 once margins are applied (e.g. 3×70mm + marginLeft 2mm).
  // Clamp margins so the full grid always fits on A4.
  const A4_WIDTH_MM = 210
  const A4_HEIGHT_MM = 297

  // Target printer-safe margin on all sides.
  // Some layouts already consume the full A4 width/height, so we apply the maximum feasible.
  const DESIRED_SAFE_MARGIN_MM = 5

  const labelWidthMm = layout.labelWidth
  const labelHeightMm = layout.labelHeight
  const requestedHorizontalGapMm = layout.horizontalGap || 0
  const requestedVerticalGapMm = layout.verticalGap || 0

  // Some layouts define gaps that make the grid exceed A4 (e.g. 12 labels: 6×48mm + 5×2mm = 298mm).
  // Clamp gaps so the grid always fits on the page.
  const maxHorizontalGapMm =
    layout.columns > 1 ? Math.max(0, (A4_WIDTH_MM - layout.columns * labelWidthMm) / (layout.columns - 1)) : 0
  const maxVerticalGapMm =
    layout.rows > 1 ? Math.max(0, (A4_HEIGHT_MM - layout.rows * labelHeightMm) / (layout.rows - 1)) : 0

  const horizontalGapMm = Math.max(0, Math.min(requestedHorizontalGapMm, maxHorizontalGapMm))
  const verticalGapMm = Math.max(0, Math.min(requestedVerticalGapMm, maxVerticalGapMm))

  // Calculate grid dimensions based on ACTUAL rows needed, not layout maximum
  const rowsNeeded = Math.ceil(totalSlotsNeeded / layout.columns)
  const actualRows = Math.min(rowsNeeded, layout.rows) // Cap at layout max
  
  const gridWidthMm = layout.columns * labelWidthMm + (layout.columns - 1) * horizontalGapMm
  const gridHeightMm = actualRows * labelHeightMm + (actualRows - 1) * verticalGapMm

  const requestedMarginLeftMm = layout.marginLeft || 0
  const requestedMarginTopMm = layout.marginTop || 0

  // Small epsilon to avoid floating point rounding pushing content onto an extra page
  const EPS_MM = 0.5

  const availableX = A4_WIDTH_MM - gridWidthMm
  const availableY = A4_HEIGHT_MM - gridHeightMm

  const safeMarginX = Math.max(
    0,
    Math.min(DESIRED_SAFE_MARGIN_MM, availableX > 0 ? (availableX - EPS_MM) / 2 : 0)
  )
  const safeMarginY = Math.max(
    0,
    Math.min(DESIRED_SAFE_MARGIN_MM, availableY > 0 ? (availableY - EPS_MM) / 2 : 0)
  )

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))

  // Ensure both right/bottom margins are >= safeMargin{X,Y} by clamping left/top into a feasible range.
  const effectiveMarginLeftMm = clamp(
    requestedMarginLeftMm,
    safeMarginX,
    Math.max(safeMarginX, availableX - safeMarginX)
  )
  const effectiveMarginTopMm = clamp(
    requestedMarginTopMm,
    safeMarginY,
    Math.max(safeMarginY, availableY - safeMarginY)
  )

  const effectiveMarginRightMm = Math.max(0, availableX - effectiveMarginLeftMm)
  const effectiveMarginBottomMm = Math.max(0, availableY - effectiveMarginTopMm)

  const labelWidthPt = mmToPt(labelWidthMm)
  const labelHeightPt = mmToPt(labelHeightMm)
  const marginLeftPt = mmToPt(effectiveMarginLeftMm)
  const marginTopPt = mmToPt(effectiveMarginTopMm)
  const marginRightPt = mmToPt(effectiveMarginRightMm)
  const marginBottomPt = mmToPt(effectiveMarginBottomMm)
  const horizontalGapPt = mmToPt(horizontalGapMm)
  const verticalGapPt = mmToPt(verticalGapMm)

  // Font sizes based on label size - scale appropriately
  const getFontSize = () => {
    const w = layout.labelWidth
    if (w <= 40) return { name: 5, hindi: 6, code: 4, price: 6 }
    if (w <= 55) return { name: 6, hindi: 7, code: 4.5, price: 7 }
    if (w <= 75) return { name: 7, hindi: 8, code: 5, price: 8 }
    return { name: 11, hindi: 13, code: 12, price: 9 }
  }

  const fontSize = getFontSize()
  const showCarton = !!(showPerCartonQty && item.perCartonQuantity && item.perCartonQuantity > 1)
  const showPriceBlock = !!(showPrice && layout.labelHeight >= 35)
  const showFooter = showCarton || showPriceBlock

  // Calculate barcode image height based on label height - adaptive sizing
  // Reduce height if footer is shown to ensure footer doesn't get cut off
  const getBarcodeImageHeight = () => {
    const h = layout.labelHeight
    const heightReduction = showFooter ? 0.8 : 1.0 // Reduce to 80% if footer is shown
    
    if (h <= 25) return mmToPt(10 * heightReduction) // Mini labels - 21mm
    if (h <= 35) return mmToPt(13 * heightReduction) // Compact labels - 30mm
    if (h <= 45) return mmToPt(16 * heightReduction) // Standard labels - 37mm
    if (h <= 70) return mmToPt(20 * heightReduction) // Large labels - 42-67mm
    return mmToPt(30 * heightReduction) // Extra large labels - 135mm
  }

  const barcodeImageHeight = getBarcodeImageHeight()

  const styles = StyleSheet.create({
    page: {
      paddingTop: marginTopPt,
      paddingLeft: marginLeftPt,
      paddingRight: marginRightPt,
      paddingBottom: Math.max(marginBottomPt, mmToPt(8)), // Ensure minimum 8mm bottom margin to prevent cutoff
      fontFamily: "NotoSans",
      backgroundColor: "#ffffff",
    },
    row: {
      flexDirection: "row",
      marginBottom: verticalGapPt,
    },
    rowLast: {
      flexDirection: "row",
      marginBottom: 0,
    },
    label: {
      width: labelWidthPt,
      height: labelHeightPt,
      overflow: "hidden",
    },
    labelContent: {
      width: "100%",
      height: "100%",
      padding: mmToPt(1.5),
      borderWidth: 0.5,
      borderColor: "#d1d5db",
      borderRadius: 1,
      backgroundColor: "#ffffff",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      paddingBottom: mmToPt(2), // Extra padding at bottom to ensure footer isn't cut
      overflow: "hidden",
    },
    placeholder: {
      width: labelWidthPt,
      height: labelHeightPt,
    },
    itemName: {
      fontSize: fontSize.name,
      fontWeight: "bold",
      textAlign: "center",
      color: "#000000",
    },
    hindiName: {
      fontSize: fontSize.hindi,
      fontWeight: "bold",
      color: "#000000",
      textAlign: "center",
      marginTop: 1,
    },
    itemCode: {
      fontSize: fontSize.code,
      color: "#666666",
      textAlign: "center",
      fontWeight: "bold",
      fontFamily: "Courier",
    },
    barcodeContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 0, // Reduced from 1 to save space
      flex: 1, // Let it grow but constrain with reduced image height
    },
    barcodeImage: {
      maxWidth: labelWidthPt - mmToPt(5),
      height: barcodeImageHeight,
      objectFit: "contain",
    },
    barcodeValue: {
      fontSize: fontSize.code,
      textAlign: "center",
      color: "#666666",
      fontFamily: "Courier",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderTopWidth: 0.3,
      borderTopColor: "#e5e7eb",
      paddingTop: 1,
    },
    footerLeft: {
      fontSize: fontSize.code,
      color: "#666666",
      fontFamily: "Courier",
    },
   
    price: {
      fontSize: fontSize.price,
      fontWeight: "bold",
      color: "#000000",
    },
    carton: {
      fontSize: fontSize.code,
      fontWeight: "bold",
      color: "#000000",
      marginLeft: 4,
      marginTop: -3,
    },
  })

  return (
    <Document>
      {pages.map((pageItems, pageIndex) => {
        // Organize items into rows for proper grid layout
        const rows: Array<Array<typeof pageItems[0]>> = []
        for (let i = 0; i < pageItems.length; i += layout.columns) {
          rows.push(pageItems.slice(i, i + layout.columns))
        }

        return (
          <Page key={pageIndex} size="A4" style={styles.page} wrap={false}>
            <View>
              {rows.map((rowItems, rowIndex) => (
                <View 
                  key={rowIndex} 
                  style={rowIndex === rows.length - 1 ? styles.rowLast : styles.row}
                >
                  {rowItems.map((slot, slotIndex) => {
                    const marginRight = slotIndex === layout.columns - 1 ? 0 : horizontalGapPt
                    if (slot.type === "placeholder") {
                      return (
                        <View
                          key={`p-${rowIndex}-${slotIndex}`}
                          style={[styles.placeholder, { marginRight }]}
                        />
                      )
                    }

                    return (
                      <View key={`l-${rowIndex}-${slotIndex}`} style={[styles.label, { marginRight }]}>
                        <View style={styles.labelContent}>
                          <View>
                            <Text style={styles.itemName}>
                              {itemName}
                            </Text>
                            {hindiName && (
                              <Text style={styles.hindiName}>
                                {hindiName}
                              </Text>
                            )}
                            {item.itemCode && layout.labelHeight >= 35 && (
                              <Text style={styles.itemCode}>{item.itemCode}</Text>
                            )}
                          </View>

                          <View style={styles.barcodeContainer}>
                            {barcodeImg && (
                              <Image style={styles.barcodeImage} src={barcodeImg} />
                            )}
                            <Text style={styles.footerLeft}>{barcodeValue}</Text>
                          </View>

                          {showFooter && (
                            <View style={styles.footer}>
                              <View>
                                {showPriceBlock && item.salePrice && (
                                  <Text style={styles.price}>₹{item.salePrice.toFixed(2)}</Text>
                                )}
                              </View>
                              <View style={{ flexDirection: "row" }}>
                                {showCarton && (
                                  <Text style={styles.carton}>{item.perCartonQuantity}{item.unit || 'PCS'}/{item.packagingUnit || 'CTN'}</Text>
                                )}
                              </View>
                            </View>
                          )}
                        </View>
                      </View>
                    )
                  })}
                </View>
              ))}
            </View>
          </Page>
        )
      })}
    </Document>
  )
}
