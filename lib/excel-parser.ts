import * as XLSX from "xlsx"

export interface ParsedRow {
  [key: string]: string | number | Date | null
}

export function parseExcelFile(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: "binary" })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet)
        resolve(jsonData)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }

    reader.readAsBinaryString(file)
  })
}

export function downloadExcelTemplate(headers: string[], filename: string) {
  // Create main data sheet with headers
  const mainData: (string | number)[][] = [
    headers,
    // Add example row with instructions
    [
      "Example Item",
      "8471",
      "1234567890123",
      "PCS",
      1,
      "",
      100,
      150,
      140,
      130,
      160,
      50,
      10,
      100,
      18,
      0,
    ],
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(mainData)

  // Set column widths for better readability
  const colWidths = [
    { wch: 20 }, // name
    { wch: 12 }, // hsnCode
    { wch: 15 }, // barcodeNo
    { wch: 10 }, // unit
    { wch: 15 }, // conversionRate
    { wch: 15 }, // alternateUnit
    { wch: 15 }, // purchasePrice
    { wch: 15 }, // salePrice
    { wch: 15 }, // wholesalePrice
    { wch: 15 }, // quantityPrice
    { wch: 12 }, // mrp
    { wch: 10 }, // stock
    { wch: 12 }, // minStock
    { wch: 12 }, // maxStock
    { wch: 12 }, // gstRate
    { wch: 12 }, // cessRate
  ]
  worksheet["!cols"] = colWidths

  // Create helper sheet with valid units
  const unitsSheet = XLSX.utils.aoa_to_sheet([
    ["Valid Units"],
    ["PCS - Pieces"],
    ["KG - Kilogram"],
    ["LTR - Liter"],
    ["MTR - Meter"],
    ["BOX - Box"],
    ["DOZEN - Dozen"],
  ])

  // Create instructions sheet
  const instructionsSheet = XLSX.utils.aoa_to_sheet([
    ["Instructions for Bulk Upload"],
    [""],
    ["1. Fill in all required fields (marked with *)"],
    ["2. Unit must be one of: PCS, KG, LTR, MTR, BOX, DOZEN"],
    ["3. Prices should be in numbers (e.g., 100.50)"],
    ["4. Stock quantities should be whole numbers"],
    ["5. GST Rate should be between 0-100"],
    [""],
    ["Column Descriptions:"],
    ["- name: Item name (required)"],
    ["- hsnCode: HSN/SAC code (optional)"],
    ["- barcodeNo: Barcode number (optional)"],
    ["- unit: Unit of measurement - use dropdown or type: PCS, KG, LTR, MTR, BOX, DOZEN"],
    ["- conversionRate: Conversion rate (default: 1)"],
    ["- alternateUnit: Alternate unit (optional)"],
    ["- purchasePrice: Purchase price (required)"],
    ["- salePrice: Sale price/MRP (required)"],
    ["- wholesalePrice: Wholesale price (optional)"],
    ["- quantityPrice: Quantity/Bulk price (optional)"],
    ["- mrp: Maximum Retail Price (optional)"],
    ["- stock: Current stock quantity"],
    ["- minStock: Minimum stock level"],
    ["- maxStock: Maximum stock level"],
    ["- gstRate: GST rate percentage (0-100)"],
    ["- cessRate: Cess rate percentage (0-100)"],
  ])

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Items")
  XLSX.utils.book_append_sheet(workbook, unitsSheet, "Valid Units")
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions")
  XLSX.writeFile(workbook, filename)
}
