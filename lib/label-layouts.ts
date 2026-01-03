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
    marginLeft: 0,
    averyCode: 'L7654',
    recommended: false,
  },
  {
    id: 'standard',
    name: 'Standard (24 labels)',
    description: 'Most items - 70×37mm - Recommended',
    columns: 3,
    rows: 8,
    totalLabels: 24,
    labelWidth: 70,
    labelHeight: 37,
    horizontalGap: 0,
    verticalGap: 0,
    marginTop: 5,
    marginLeft: 0,
    averyCode: 'L7159',
    recommended: true,
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
    name: 'Extra Large (12 labels)',
    description: 'Large products - 105×48mm',
    columns: 2,
    rows: 6,
    totalLabels: 12,
    labelWidth: 105,
    labelHeight: 48,
    horizontalGap: 0,
    verticalGap: 2,
    marginTop: 5,
    marginLeft: 0,
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
export function calculateSheetsNeeded(quantity: number, layout: LabelLayout): number {
  // Validate inputs
  if (!isValidLayout(layout)) {
    console.error('[Label Layouts] Invalid layout provided to calculateSheetsNeeded')
    return 1
  }
  
  if (typeof quantity !== 'number' || isNaN(quantity) || quantity < 0) {
    console.warn(`[Label Layouts] Invalid quantity: ${quantity}, defaulting to 1 sheet`)
    return 1
  }
  
  if (quantity === 0) return 0
  
  const sheets = Math.ceil(quantity / layout.totalLabels)
  return Math.max(1, sheets) // Ensure at least 1 sheet
}

/**
 * Calculate how many labels will be wasted
 * @param quantity - Number of labels needed
 * @param layout - Label layout configuration
 * @returns number - Number of wasted labels (0 or positive)
 */
export function calculateWastedLabels(quantity: number, layout: LabelLayout): number {
  // Validate inputs
  if (!isValidLayout(layout)) {
    console.error('[Label Layouts] Invalid layout provided to calculateWastedLabels')
    return 0
  }
  
  if (typeof quantity !== 'number' || isNaN(quantity) || quantity < 0) {
    console.warn(`[Label Layouts] Invalid quantity: ${quantity}, returning 0 wasted labels`)
    return 0
  }
  
  const sheetsNeeded = calculateSheetsNeeded(quantity, layout)
  const totalLabelsAvailable = sheetsNeeded * layout.totalLabels
  const wasted = totalLabelsAvailable - quantity
  
  return Math.max(0, wasted) // Ensure non-negative
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
  
  return {
    '--label-width': `${validLayout.labelWidth}mm`,
    '--label-height': `${validLayout.labelHeight}mm`,
    '--label-columns': validLayout.columns.toString(),
    '--label-rows': validLayout.rows.toString(),
    '--horizontal-gap': `${validLayout.horizontalGap}mm`,
    '--vertical-gap': `${validLayout.verticalGap}mm`,
    '--margin-top': `${validLayout.marginTop}mm`,
    '--margin-left': `${validLayout.marginLeft}mm`,
  }
}
