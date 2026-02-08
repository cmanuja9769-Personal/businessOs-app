/**
 * Barcode Label Layout Configurations
 * Standard A4 paper layouts for barcode label printing
 */

export interface LabelLayout {
  id: string
  name: string
  description: string
  columns: number
  rows: number
  totalLabels: number
  labelWidth: number // in mm
  labelHeight: number // in mm
  horizontalGap: number // in mm
  verticalGap: number // in mm
  marginTop: number // in mm
  marginLeft: number // in mm
  averyCode?: string
  recommended: boolean
}

export const LABEL_LAYOUTS: LabelLayout[] = [
  {
    id: 'mini',
    name: 'Mini (65 labels)',
    description: 'Tiny items, price tags - 38×21mm',
    columns: 5,
    rows: 13,
    totalLabels: 65,
    labelWidth: 38.1,
    labelHeight: 21.2,
    horizontalGap: 2.5,
    verticalGap: 0,
    marginTop: 8.5,
    marginLeft: 7.5,
    averyCode: 'L7651',
    recommended: false,
  },
  {
    id: 'compact',
    name: 'Compact (40 labels)',
    description: 'Small items - 52×30mm',
    columns: 4,
    rows: 10,
    totalLabels: 40,
    labelWidth: 52.5,
    labelHeight: 29.7,
    horizontalGap: 0,
    verticalGap: 0,
    marginTop: 5,
    marginLeft: 2,
    averyCode: 'L7654',
    recommended: false,
  },
  {
    id: 'standard',
    name: 'Standard (24 labels)',
    description: 'Most items - 70×37mm',
    columns: 3,
    rows: 8,
    totalLabels: 24,
    labelWidth: 70,
    labelHeight: 37,
    horizontalGap: 0,
    verticalGap: 0,
    marginTop: 5,
    marginLeft: 2,
    averyCode: 'L7159',
    recommended: false,
  },
  {
    id: 'large',
    name: 'Large (21 labels)',
    description: 'Detailed labels - 70×42mm',
    columns: 3,
    rows: 7,
    totalLabels: 21,
    labelWidth: 70,
    labelHeight: 42.3,
    horizontalGap: 0,
    verticalGap: 0,
    marginTop: 5,
    marginLeft: 0,
    averyCode: 'L7160',
    recommended: false,
  },
  {
    id: 'xl',
    name: 'Extra Large (12 labels) ★ Recommended',
    description: 'Best for retail - 100×44mm - 12 stickers/page',
    columns: 2,
    rows: 6,
    totalLabels: 12,
    labelWidth: 100,
    labelHeight: 44,
    horizontalGap: 2,
    verticalGap: 3,
    marginTop: 5,
    marginLeft: 3,
    recommended: true,
  },
  {
    id: 'layout-8',
    name: 'Large (8 labels)',
    description: 'Shipping labels - 99×67mm',
    columns: 2,
    rows: 4,
    totalLabels: 8,
    labelWidth: 99,
    labelHeight: 67,
    horizontalGap: 2,
    verticalGap: 2,
    marginTop: 10,
    marginLeft: 5,
    recommended: false,
  },
  {
    id: 'layout-4',
    name: 'Extra Large (4 labels)',
    description: 'Warehouse labels - 99×135mm',
    columns: 2,
    rows: 2,
    totalLabels: 4,
    labelWidth: 99,
    labelHeight: 135,
    horizontalGap: 2,
    verticalGap: 2,
    marginTop: 10,
    marginLeft: 5,
    recommended: false,
  },
]

/**
 * Safely get layout by ID with validation
 * @param id - Layout ID
 * @returns LabelLayout - Always returns a valid layout (standard as fallback)
 */
export function getLayoutById(id: string | null | undefined): LabelLayout {
  if (!id || typeof id !== 'string') {
    console.warn('[Label Layouts] Invalid layout ID provided, using standard layout')
    return LABEL_LAYOUTS[2] // Standard layout
  }
  
  const layout = LABEL_LAYOUTS.find(layout => layout.id === id)
  if (!layout) {
    console.warn(`[Label Layouts] Layout "${id}" not found, using standard layout`)
    return LABEL_LAYOUTS[2] // Standard layout as fallback
  }
  
  return layout
}

/**
 * Get the recommended default layout
 * @returns LabelLayout - Always returns a valid layout
 */
export function getDefaultLayout(): LabelLayout {
  const recommended = LABEL_LAYOUTS.find(layout => layout.recommended)
  if (!recommended) {
    console.warn('[Label Layouts] No recommended layout found, using standard layout')
    return LABEL_LAYOUTS[2] // Standard layout as ultimate fallback
  }
  return recommended
}

/**
 * Validate a layout object has all required properties
 * @param layout - Layout to validate
 * @returns boolean - True if valid
 */
export function isValidLayout(layout: any): layout is LabelLayout {
  return (
    layout &&
    typeof layout === 'object' &&
    typeof layout.columns === 'number' &&
    typeof layout.rows === 'number' &&
    typeof layout.totalLabels === 'number' &&
    typeof layout.labelWidth === 'number' &&
    typeof layout.labelHeight === 'number' &&
    layout.columns > 0 &&
    layout.rows > 0 &&
    layout.totalLabels > 0 &&
    layout.labelWidth > 0 &&
    layout.labelHeight > 0
  )
}

/**
 * Calculate how many sheets are needed for a given quantity
 * @param quantity - Number of labels needed
 * @param layout - Label layout configuration
 * @returns number - Number of sheets (minimum 1)
 */
export function calculateSheetsNeeded(quantity: number, layout: LabelLayout, startPosition: number = 1): number {
  if (!isValidLayout(layout)) {
    return 1
  }
  
  if (typeof quantity !== 'number' || isNaN(quantity) || quantity < 0) {
    return 1
  }
  
  if (quantity === 0) return 0
  
  const skippedOnFirstSheet = Math.max(0, Math.min(startPosition - 1, layout.totalLabels - 1))
  const labelsOnFirstSheet = layout.totalLabels - skippedOnFirstSheet
  
  if (quantity <= labelsOnFirstSheet) return 1
  
  const remaining = quantity - labelsOnFirstSheet
  return 1 + Math.ceil(remaining / layout.totalLabels)
}

/**
 * Calculate how many labels will be wasted
 * @param quantity - Number of labels needed
 * @param layout - Label layout configuration
 * @returns number - Number of wasted labels (0 or positive)
 */
export function calculateWastedLabels(quantity: number, layout: LabelLayout, startPosition: number = 1): number {
  if (!isValidLayout(layout)) {
    return 0
  }
  
  if (typeof quantity !== 'number' || isNaN(quantity) || quantity < 0) {
    return 0
  }
  
  const skippedOnFirstSheet = Math.max(0, Math.min(startPosition - 1, layout.totalLabels - 1))
  const sheetsNeeded = calculateSheetsNeeded(quantity, layout, startPosition)
  const totalLabelsAvailable = sheetsNeeded * layout.totalLabels
  const wasted = totalLabelsAvailable - quantity - skippedOnFirstSheet
  
  return Math.max(0, wasted)
}

/**
 * Generate empty placeholder labels for start position offset
 * @param startPosition - 1-indexed position to start (1 to totalLabels)
 * @param maxPosition - Maximum allowed position (default: 100)
 * @returns number[] - Array of placeholder indices
 */
export function generatePlaceholderLabels(startPosition: number, maxPosition: number = 100): number[] {
  // Validate input
  if (typeof startPosition !== 'number' || isNaN(startPosition)) {
    console.warn(`[Label Layouts] Invalid startPosition: ${startPosition}, using 1`)
    return []
  }
  
  // Clamp to valid range
  const validPosition = Math.max(1, Math.min(maxPosition, Math.floor(startPosition)))
  
  // startPosition is 1-indexed (1 to totalLabels)
  // We need (startPosition - 1) placeholders
  const placeholders = validPosition > 1 ? validPosition - 1 : 0
  
  // Safety check to prevent excessive array creation
  if (placeholders > 1000) {
    console.error(`[Label Layouts] Too many placeholders requested: ${placeholders}, limiting to 100`)
    return Array(100).fill(0).map((_, i) => i)
  }
  
  return Array(placeholders).fill(0).map((_, i) => i)
}

/**
 * Validate start position is within layout bounds
 * @param startPosition - Position to validate
 * @param layout - Label layout
 * @returns number - Valid start position (1 to totalLabels)
 */
export function validateStartPosition(startPosition: number, layout: LabelLayout): number {
  if (!isValidLayout(layout)) {
    console.error('[Label Layouts] Invalid layout provided to validateStartPosition')
    return 1
  }
  
  if (typeof startPosition !== 'number' || isNaN(startPosition)) {
    console.warn(`[Label Layouts] Invalid start position: ${startPosition}, using 1`)
    return 1
  }
  
  // Clamp between 1 and totalLabels
  return Math.max(1, Math.min(layout.totalLabels, Math.floor(startPosition)))
}

/**
 * Get CSS variables for a specific layout with fallbacks
 * @param layout - Label layout configuration
 * @returns Record<string, string> - CSS variables object
 */
export function getLayoutCSSVariables(layout: LabelLayout | null | undefined): Record<string, string> {
  // Validate and use default if invalid
  const validLayout = layout && isValidLayout(layout) ? layout : getDefaultLayout()

  // Match the PDF output: A4 page with clamped gaps/margins so the grid always fits.
  const A4_WIDTH_MM = 210
  const A4_HEIGHT_MM = 297
  const DESIRED_SAFE_MARGIN_MM = 5
  const EPS_MM = 0.5

  const cols = Math.max(1, Math.floor(validLayout.columns))
  const rows = Math.max(1, Math.floor(validLayout.rows))
  const labelWidthMm = Math.max(1, validLayout.labelWidth)
  const labelHeightMm = Math.max(1, validLayout.labelHeight)

  const requestedHorizontalGapMm = Math.max(0, validLayout.horizontalGap)
  const requestedVerticalGapMm = Math.max(0, validLayout.verticalGap)

  const maxHorizontalGapMm = cols > 1 ? Math.max(0, (A4_WIDTH_MM - cols * labelWidthMm) / (cols - 1)) : 0
  const maxVerticalGapMm = rows > 1 ? Math.max(0, (A4_HEIGHT_MM - rows * labelHeightMm) / (rows - 1)) : 0

  const horizontalGapMm = Math.max(0, Math.min(requestedHorizontalGapMm, maxHorizontalGapMm))
  const verticalGapMm = Math.max(0, Math.min(requestedVerticalGapMm, maxVerticalGapMm))

  const gridWidthMm = cols * labelWidthMm + (cols - 1) * horizontalGapMm
  const gridHeightMm = rows * labelHeightMm + (rows - 1) * verticalGapMm

  const availableX = A4_WIDTH_MM - gridWidthMm
  const availableY = A4_HEIGHT_MM - gridHeightMm

  const safeMarginX = Math.max(0, Math.min(DESIRED_SAFE_MARGIN_MM, availableX > 0 ? (availableX - EPS_MM) / 2 : 0))
  const safeMarginY = Math.max(0, Math.min(DESIRED_SAFE_MARGIN_MM, availableY > 0 ? (availableY - EPS_MM) / 2 : 0))

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))
  const requestedMarginLeftMm = Math.max(0, validLayout.marginLeft)
  const requestedMarginTopMm = Math.max(0, validLayout.marginTop)

  const marginLeftMm = clamp(requestedMarginLeftMm, safeMarginX, Math.max(safeMarginX, availableX - safeMarginX))
  const marginTopMm = clamp(requestedMarginTopMm, safeMarginY, Math.max(safeMarginY, availableY - safeMarginY))
  const marginRightMm = Math.max(0, availableX - marginLeftMm)
  const marginBottomMm = Math.max(0, availableY - marginTopMm)
  
  return {
    '--label-width': `${labelWidthMm}mm`,
    '--label-height': `${labelHeightMm}mm`,
    '--label-columns': validLayout.columns.toString(),
    '--label-rows': validLayout.rows.toString(),
    '--horizontal-gap': `${horizontalGapMm}mm`,
    '--vertical-gap': `${verticalGapMm}mm`,
    '--margin-top': `${marginTopMm}mm`,
    '--margin-right': `${marginRightMm}mm`,
    '--margin-bottom': `${marginBottomMm}mm`,
    '--margin-left': `${marginLeftMm}mm`,
  }
}
