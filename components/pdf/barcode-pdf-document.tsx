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
import type { BarcodeQueueEntry } from "@/store/use-barcode-queue-store"
import JsBarcode from "jsbarcode"

Font.register({
  family: "NotoSans",
  fonts: [
    {
      src: "/fonts/noto-sans-400.woff",
      fontWeight: 400,
    },
    {
      src: "/fonts/noto-sans-700.woff",
      fontWeight: 700,
    },
  ],
})

export interface BatchBarcodePDFProps {
  queue: BarcodeQueueEntry[]
  layout: LabelLayout
  startPosition?: number
  showPrice?: boolean
  showPerCartonQty?: boolean
  logoUrl?: string
}

export interface SingleBarcodePDFProps {
  item: IItem
  quantity: number
  layout: LabelLayout
  startPosition?: number
  showPrice?: boolean
  showPerCartonQty?: boolean
  hindiName?: string
  logoUrl?: string
}

export type BarcodePDFDocumentProps = BatchBarcodePDFProps | SingleBarcodePDFProps

function isBatchProps(props: BarcodePDFDocumentProps): props is BatchBarcodePDFProps {
  return "queue" in props && Array.isArray(props.queue)
}

interface LabelSlot {
  type: "label"
  item: IItem
  barcodeValue: string
  barcodeImg: string
  hindiName?: string
}

const mmToPt = (mm: number) => mm * 2.83465

const BARCODE_CACHE_MAX = 200
const barcodeCache = new Map<string, string>()

function barcodeCacheGet(key: string): string | undefined {
  const val = barcodeCache.get(key)
  if (val !== undefined) {
    barcodeCache.delete(key)
    barcodeCache.set(key, val)
  }
  return val
}

function barcodeCacheSet(key: string, value: string) {
  if (barcodeCache.size >= BARCODE_CACHE_MAX) {
    const oldest = barcodeCache.keys().next().value
    if (oldest !== undefined) barcodeCache.delete(oldest)
  }
  barcodeCache.set(key, value)
}

const generateBarcodeDataURL = (value: string, labelWidth: number): string => {
  if (typeof window === "undefined") return ""

  const cacheKey = `${value}_${labelWidth}`
  const cached = barcodeCacheGet(cacheKey)
  if (cached) return cached

  const canvas = document.createElement("canvas")
  try {
    let barcodeWidth = 1.5
    let barcodeHeight = 35
    let margin = 2

    if (labelWidth <= 40) {
      barcodeWidth = 1.2
      barcodeHeight = 22
      margin = 1
    } else if (labelWidth <= 55) {
      barcodeWidth = 1.4
      barcodeHeight = 28
      margin = 2
    } else if (labelWidth <= 75) {
      barcodeWidth = 1.5
      barcodeHeight = 32
      margin = 2
    } else {
      barcodeWidth = 1.8
      barcodeHeight = 38
      margin = 2
    }

    JsBarcode(canvas, value, {
      format: "CODE128",
      width: barcodeWidth,
      height: barcodeHeight,
      displayValue: false,
      margin,
      background: "#ffffff",
      lineColor: "#000000",
    })
    const dataUrl = canvas.toDataURL("image/png")
    barcodeCacheSet(cacheKey, dataUrl)
    return dataUrl
  } catch (e) {
    console.error("Barcode generation failed:", e)
    return ""
  }
}

function formatPrintDate(): string {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function buildLabelSlots(
  props: BarcodePDFDocumentProps,
  labelWidth: number
): LabelSlot[] {
  const slots: LabelSlot[] = []

  if (isBatchProps(props)) {
    for (const entry of props.queue) {
      const barcodeValue =
        entry.item.barcodeNo || entry.item.itemCode || "0000000000000"
      const barcodeImg = generateBarcodeDataURL(barcodeValue, labelWidth)
      for (let i = 0; i < entry.quantity; i++) {
        slots.push({
          type: "label",
          item: entry.item,
          barcodeValue,
          barcodeImg,
          hindiName: entry.hindiName,
        })
      }
    }
  } else {
    const barcodeValue =
      props.item.barcodeNo || props.item.itemCode || "0000000000000"
    const barcodeImg = generateBarcodeDataURL(barcodeValue, labelWidth)
    for (let i = 0; i < props.quantity; i++) {
      slots.push({
        type: "label",
        item: props.item,
        barcodeValue,
        barcodeImg,
        hindiName: props.hindiName,
      })
    }
  }

  return slots
}

export function BarcodePDFDocument(props: BarcodePDFDocumentProps) {
  const {
    layout,
    startPosition = 1,
    showPrice = false,
    showPerCartonQty = false,
    logoUrl,
  } = props

  const printDate = formatPrintDate()
  const labelSlots = buildLabelSlots(props, layout.labelWidth)

  const placeholderCount = Math.max(0, startPosition - 1)
  const labelsPerPage = layout.columns * layout.rows

  const allSlots: (LabelSlot | null)[] = [
    ...Array(placeholderCount).fill(null),
    ...labelSlots,
  ]

  const pages: (LabelSlot | null)[][] = []
  for (let i = 0; i < allSlots.length; i += labelsPerPage) {
    pages.push(allSlots.slice(i, i + labelsPerPage))
  }

  if (pages.length === 0) {
    pages.push([])
  }

  const A4_WIDTH_MM = 210
  const A4_HEIGHT_MM = 297
  const DESIRED_SAFE_MARGIN_MM = 5
  const EPS_MM = 0.5

  const labelWidthMm = layout.labelWidth
  const labelHeightMm = layout.labelHeight
  const requestedHorizontalGapMm = layout.horizontalGap || 0
  const requestedVerticalGapMm = layout.verticalGap || 0

  const maxHorizontalGapMm =
    layout.columns > 1
      ? Math.max(0, (A4_WIDTH_MM - layout.columns * labelWidthMm) / (layout.columns - 1))
      : 0
  const maxVerticalGapMm =
    layout.rows > 1
      ? Math.max(0, (A4_HEIGHT_MM - layout.rows * labelHeightMm) / (layout.rows - 1))
      : 0

  const horizontalGapMm = Math.max(0, Math.min(requestedHorizontalGapMm, maxHorizontalGapMm))
  const verticalGapMm = Math.max(0, Math.min(requestedVerticalGapMm, maxVerticalGapMm))

  const gridWidthMm = layout.columns * labelWidthMm + (layout.columns - 1) * horizontalGapMm
  const gridHeightMm = layout.rows * labelHeightMm + (layout.rows - 1) * verticalGapMm

  const requestedMarginLeftMm = layout.marginLeft || 0
  const requestedMarginTopMm = layout.marginTop || 0

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

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(value, max))

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

  const getFontSize = () => {
    const w = layout.labelWidth
    if (w <= 40) return { name: 5, hindi: 5, code: 3.5, price: 5, date: 3 }
    if (w <= 55) return { name: 6, hindi: 6, code: 4, price: 6, date: 3.5 }
    if (w <= 75) return { name: 7, hindi: 7, code: 5, price: 7, date: 4 }
    return { name: 9, hindi: 10, code: 7, price: 8, date: 5 }
  }

  const fontSize = getFontSize()

  const getBarcodeImageHeight = () => {
    const h = layout.labelHeight
    const reduction = showPrice || showPerCartonQty ? 0.7 : 0.85
    if (h <= 25) return mmToPt(6 * reduction)
    if (h <= 35) return mmToPt(8 * reduction)
    if (h <= 45) return mmToPt(10 * reduction)
    if (h <= 70) return mmToPt(14 * reduction)
    return mmToPt(22 * reduction)
  }

  const barcodeImageHeight = getBarcodeImageHeight()
  const logoSize = layout.labelWidth <= 55 ? mmToPt(3) : mmToPt(4)

  const styles = StyleSheet.create({
    page: {
      width: mmToPt(210),
      height: mmToPt(297),
      paddingTop: marginTopPt,
      paddingLeft: marginLeftPt,
      paddingRight: marginRightPt,
      paddingBottom: Math.max(marginBottomPt, mmToPt(5)),
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
      padding: mmToPt(1),
      borderWidth: 0.5,
      borderColor: "#9ca3af",
      borderRadius: 1,
      backgroundColor: "#ffffff",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      paddingBottom: mmToPt(1),
      overflow: "hidden",
    },
    placeholder: {
      width: labelWidthPt,
      height: labelHeightPt,
    },
    labelHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: mmToPt(0.5),
    },
    logo: {
      width: logoSize,
      height: logoSize,
    },
    dateText: {
      fontSize: fontSize.date,
      color: "#9ca3af",
      fontFamily: "Courier",
    },
    itemName: {
      fontSize: fontSize.name,
      fontWeight: "bold",
      textAlign: "center",
      color: "#000000",
      maxLines: 1,
    },
    hindiName: {
      fontSize: fontSize.hindi,
      fontWeight: "bold",
      color: "#000000",
      textAlign: "center",
      marginTop: 0.5,
      maxLines: 1,
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
      flex: 1,
      paddingVertical: 0,
    },
    barcodeImage: {
      maxWidth: labelWidthPt - mmToPt(6),
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
      borderTopColor: "#d1d5db",
      paddingTop: 1,
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
    },
  })

  return (
    <Document>
      {pages.map((pageSlots, pageIndex) => {
        const rows: (LabelSlot | null)[][] = []
        for (let i = 0; i < pageSlots.length; i += layout.columns) {
          rows.push(pageSlots.slice(i, i + layout.columns))
        }

        while (rows.length < layout.rows) {
          rows.push(Array(layout.columns).fill(null))
        }

        return (
          <Page key={pageIndex} size="A4" style={styles.page} wrap={false}>
            <View>
              {rows.map((rowItems, rowIndex) => (
                <View
                  key={rowIndex}
                  style={rowIndex === rows.length - 1 ? styles.rowLast : styles.row}
                >
                  {Array.from({ length: layout.columns }).map((_, colIndex) => {
                    const slot = rowItems[colIndex] ?? null
                    const marginRight =
                      colIndex === layout.columns - 1 ? 0 : horizontalGapPt

                    if (!slot) {
                      return (
                        <View
                          key={`empty-${rowIndex}-${colIndex}`}
                          style={[styles.placeholder, { marginRight }]}
                        />
                      )
                    }

                    const { item, barcodeValue, barcodeImg, hindiName } = slot
                    const showCarton = !!(
                      showPerCartonQty &&
                      item.perCartonQuantity &&
                      item.perCartonQuantity > 1
                    )
                    const showPriceBlock = !!(showPrice && layout.labelHeight >= 35)
                    const showFooter = showCarton || showPriceBlock

                    return (
                      <View
                        key={`label-${rowIndex}-${colIndex}`}
                        style={[styles.label, { marginRight }]}
                      >
                        <View style={styles.labelContent}>
                          <View style={styles.labelHeader}>
                            {logoUrl ? (
                              <Image style={styles.logo} src={logoUrl} />
                            ) : (
                              <View style={styles.logo} />
                            )}
                            <Text style={styles.dateText}>{printDate}</Text>
                          </View>

                          <View>
                            <Text style={styles.itemName}>
                              {item.name || "Unnamed Item"}
                            </Text>
                            {hindiName && (
                              <Text style={styles.hindiName}>{hindiName}</Text>
                            )}
                            {item.itemCode && layout.labelHeight >= 35 && (
                              <Text style={styles.itemCode}>{item.itemCode}</Text>
                            )}
                          </View>

                          <View style={styles.barcodeContainer}>
                            {barcodeImg ? (
                              <Image style={styles.barcodeImage} src={barcodeImg} />
                            ) : null}
                            <Text style={styles.barcodeValue}>{barcodeValue}</Text>
                          </View>

                          {showFooter && (
                            <View style={styles.footer}>
                              <View>
                                {showPriceBlock && item.salePrice ? (
                                  <Text style={styles.price}>
                                    ₹{item.salePrice.toFixed(2)}
                                  </Text>
                                ) : null}
                              </View>
                              <View>
                                {showCarton && (
                                  <Text style={styles.carton}>
                                    {item.perCartonQuantity}
                                    {item.unit || "PCS"}/{item.packagingUnit || "CTN"}
                                  </Text>
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
