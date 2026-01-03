/**
 * Barcode generation utilities for inventory items
 * Supports EAN-13, EAN-8, custom SKU formats, and sequential generation
 */

/**
 * Validates if a barcode follows EAN-13 format (13 digits)
 */
export function isValidEAN13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) return false
  
  // Validate EAN-13 checksum
  const digits = barcode.split('').map(Number)
  const checkDigit = digits[12]
  const sum = digits.slice(0, 12).reduce((acc, digit, idx) => {
    return acc + digit * (idx % 2 === 0 ? 1 : 3)
  }, 0)
  const calculatedCheckDigit = (10 - (sum % 10)) % 10
  
  return checkDigit === calculatedCheckDigit
}

/**
 * Validates if a barcode follows EAN-8 format (8 digits)
 */
export function isValidEAN8(barcode: string): boolean {
  if (!/^\d{8}$/.test(barcode)) return false
  
  // Validate EAN-8 checksum
  const digits = barcode.split('').map(Number)
  const checkDigit = digits[7]
  const sum = digits.slice(0, 7).reduce((acc, digit, idx) => {
    return acc + digit * (idx % 2 === 0 ? 3 : 1)
  }, 0)
  const calculatedCheckDigit = (10 - (sum % 10)) % 10
  
  return checkDigit === calculatedCheckDigit
}

/**
 * Validates if a barcode follows UPC-A format (12 digits)
 */
export function isValidUPCA(barcode: string): boolean {
  if (!/^\d{12}$/.test(barcode)) return false
  
  // Validate UPC-A checksum
  const digits = barcode.split('').map(Number)
  const checkDigit = digits[11]
  const sum = digits.slice(0, 11).reduce((acc, digit, idx) => {
    return acc + digit * (idx % 2 === 0 ? 3 : 1)
  }, 0)
  const calculatedCheckDigit = (10 - (sum % 10)) % 10
  
  return checkDigit === calculatedCheckDigit
}

/**
 * Validates any supported barcode format
 */
export function validateBarcode(barcode: string): { isValid: boolean; format?: string; error?: string } {
  if (!barcode || barcode.trim() === '') {
    return { isValid: true } // Empty barcodes are allowed
  }

  const trimmed = barcode.trim()

  // Check for valid formats
  if (isValidEAN13(trimmed)) {
    return { isValid: true, format: 'EAN-13' }
  }
  if (isValidEAN8(trimmed)) {
    return { isValid: true, format: 'EAN-8' }
  }
  if (isValidUPCA(trimmed)) {
    return { isValid: true, format: 'UPC-A' }
  }

  // Allow custom alphanumeric barcodes (SKU-based, sequential, etc.)
  if (/^[A-Z0-9\-_]+$/i.test(trimmed)) {
    return { isValid: true, format: 'Custom' }
  }

  return {
    isValid: false,
    error: 'Invalid barcode format. Use EAN-13 (13 digits), EAN-8 (8 digits), UPC-A (12 digits), or custom alphanumeric (A-Z, 0-9, -, _)',
  }
}

/**
 * Generates EAN-13 barcode with checksum
 * @param baseNumber - 12-digit base number (without check digit)
 * @returns Complete 13-digit EAN-13 barcode
 */
export function generateEAN13(baseNumber: string): string {
  if (!/^\d{12}$/.test(baseNumber)) {
    throw new Error('Base number must be exactly 12 digits')
  }

  const digits = baseNumber.split('').map(Number)
  const sum = digits.reduce((acc, digit, idx) => {
    return acc + digit * (idx % 2 === 0 ? 1 : 3)
  }, 0)
  const checkDigit = (10 - (sum % 10)) % 10

  return baseNumber + checkDigit
}

/**
 * Generates sequential barcode with custom prefix
 * @param prefix - Prefix for the barcode (default: 'BAR')
 * @param sequence - Sequential number
 * @param padding - Number of digits for the sequence (default: 6)
 * @returns Formatted barcode like BAR000001, BAR000002, etc.
 */
export function generateSequentialBarcode(
  sequence: number,
  prefix: string = 'BAR',
  padding: number = 6
): string {
  const paddedSequence = sequence.toString().padStart(padding, '0')
  return `${prefix}${paddedSequence}`
}

/**
 * Generates barcode based on item code
 * @param itemCode - Item code to base the barcode on
 * @returns Barcode derived from item code
 */
export function generateBarcodeFromItemCode(itemCode: string): string {
  // Clean the item code and convert to uppercase
  const cleaned = itemCode.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return `BC${cleaned}`
}

/**
 * Generates a batch of sequential barcodes
 * @param count - Number of barcodes to generate
 * @param startNumber - Starting sequence number (default: 1)
 * @param prefix - Prefix for barcodes (default: 'BAR')
 * @returns Array of generated barcodes
 */
export function generateBarcodesBatch(
  count: number,
  startNumber: number = 1,
  prefix: string = 'BAR'
): string[] {
  const barcodes: string[] = []
  for (let i = 0; i < count; i++) {
    barcodes.push(generateSequentialBarcode(startNumber + i, prefix))
  }
  return barcodes
}

/**
 * Gets the next available barcode number from existing barcodes
 * @param existingBarcodes - Array of existing barcodes with the same prefix
 * @param prefix - Prefix to use for new barcode
 * @returns Next available sequential barcode
 */
export function getNextBarcode(existingBarcodes: string[], prefix: string = 'BAR'): string {
  const prefixBarcodes = existingBarcodes
    .filter((bc) => bc.startsWith(prefix))
    .map((bc) => {
      const numPart = bc.substring(prefix.length)
      return parseInt(numPart, 10)
    })
    .filter((num) => !isNaN(num))

  const maxNumber = prefixBarcodes.length > 0 ? Math.max(...prefixBarcodes) : 0
  return generateSequentialBarcode(maxNumber + 1, prefix)
}

/**
 * Auto-generates barcodes for items missing them
 * @param items - Array of items (must have id or itemCode)
 * @param existingBarcodes - Array of existing barcodes in system
 * @param options - Generation options
 * @returns Items with auto-generated barcodes
 */
export function autoGenerateBarcodes<T extends { barcodeNo?: string; itemCode?: string; id?: string }>(
  items: T[],
  existingBarcodes: string[] = [],
  options: {
    prefix?: string
    strategy?: 'sequential' | 'itemcode-based'
  } = {}
): T[] {
  const { prefix = 'BAR', strategy = 'sequential' } = options

  let nextSequence = 1
  if (strategy === 'sequential') {
    // Find the highest existing sequence number
    const prefixBarcodes = existingBarcodes
      .filter((bc) => bc.startsWith(prefix))
      .map((bc) => parseInt(bc.substring(prefix.length), 10))
      .filter((num) => !isNaN(num))
    nextSequence = prefixBarcodes.length > 0 ? Math.max(...prefixBarcodes) + 1 : 1
  }

  return items.map((item) => {
    if (item.barcodeNo && item.barcodeNo.trim() !== '') {
      return item // Already has barcode
    }

    let generatedBarcode: string
    if (strategy === 'itemcode-based' && item.itemCode) {
      generatedBarcode = generateBarcodeFromItemCode(item.itemCode)
    } else {
      generatedBarcode = generateSequentialBarcode(nextSequence, prefix)
      nextSequence++
    }

    return {
      ...item,
      barcodeNo: generatedBarcode,
    }
  })
}

/**
 * Detects duplicate barcodes in a list
 * @param barcodes - Array of barcode numbers
 * @returns Object with duplicate information
 */
export function findDuplicateBarcodes(barcodes: (string | undefined)[]): {
  hasDuplicates: boolean
  duplicates: Record<string, number>
  duplicatesList: string[]
} {
  const nonEmptyBarcodes = barcodes.filter((bc) => bc && bc.trim() !== '') as string[]
  const counts: Record<string, number> = {}

  nonEmptyBarcodes.forEach((bc) => {
    counts[bc] = (counts[bc] || 0) + 1
  })

  const duplicates = Object.fromEntries(Object.entries(counts).filter(([_, count]) => count > 1))

  return {
    hasDuplicates: Object.keys(duplicates).length > 0,
    duplicates,
    duplicatesList: Object.keys(duplicates),
  }
}
