import * as XLSX from "xlsx"
import ExcelJS from "exceljs"

export interface ParsedRow {
  [key: string]: string | number | Date | null
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[%]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function remapRowKeys(row: ParsedRow): ParsedRow {
  const mapped: ParsedRow = {}

  const keyMap: Record<string, string> = {
    // Items
    id: "id",
    item_id: "id",
    item_code: "itemCode",
    itemcode: "itemCode",
    name: "name",
    item_name: "name",
    product_name: "name",
    category: "category",
    hsn: "hsnCode",
    hsn_code: "hsnCode",
    hsnsac: "hsnCode",
    hsn_sac: "hsnCode",
    barcode: "barcodeNo",
    barcode_no: "barcodeNo",
    barcodeno: "barcodeNo",
    unit: "unit",
    uom: "unit",
    conversion_rate: "conversionRate",
    conversionrate: "conversionRate",
    alternate_unit: "alternateUnit",
    alternateunit: "alternateUnit",
    purchase_price: "purchasePrice",
    purchaseprice: "purchasePrice",
    sale_price: "salePrice",
    saleprice: "salePrice",
    wholesale_price: "wholesalePrice",
    wholesaleprice: "wholesalePrice",
    quantity_price: "quantityPrice",
    quantityprice: "quantityPrice",
    mrp: "mrp",
    discount_type: "discountType",
    discounttype: "discountType",
    sale_discount: "saleDiscount",
    salediscount: "saleDiscount",
    stock: "stock",
    current_stock: "stock",
    min_stock: "minStock",
    minstock: "minStock",
    max_stock: "maxStock",
    maxstock: "maxStock",
    item_location: "itemLocation",
    itemlocation: "itemLocation",
    location: "itemLocation",
    godown: "godownName",
    godown_name: "godownName",
    warehouse: "godownName",
    warehouse_name: "godownName",
    per_carton_quantity: "perCartonQuantity",
    percartonquantity: "perCartonQuantity",
    per_carton_qty: "perCartonQuantity",
    carton_quantity: "perCartonQuantity",
    carton_qty: "perCartonQuantity",
    gst_rate: "gstRate",
    gstrate: "gstRate",
    gst: "gstRate",
    tax_rate: "taxRate",
    taxrate: "taxRate",
    cess_rate: "cessRate",
    cessrate: "cessRate",
    inclusive_of_tax: "inclusiveOfTax",
    inclusiveoftax: "inclusiveOfTax",
    tax_inclusive: "inclusiveOfTax",

    // Customers
    customer_name: "name",
    contact_no: "contactNo",
    contactno: "contactNo",
    phone: "contactNo",
    mobile: "contactNo",
    email: "email",
    address: "address",
    opening_balance: "openingBalance",
    openingbalance: "openingBalance",
    opening_date: "openingDate",
    openingdate: "openingDate",
    gstin: "gstinNo",
    gstin_no: "gstinNo",
    gstinno: "gstinNo",
  }

  for (const [rawKey, value] of Object.entries(row)) {
    const normalized = normalizeHeader(rawKey)
    const mappedKey = keyMap[normalized] || rawKey
    mapped[mappedKey] = value
  }

  return mapped
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
        resolve(jsonData.map(remapRowKeys))
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
      12,
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
    { wch: 15 }, // perCartonQuantity
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
    ["- perCartonQuantity: Number of pieces per carton box (optional)"],
    ["- gstRate: GST rate percentage (0-100)"],
    ["- cessRate: Cess rate percentage (0-100)"],
  ])

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Items")
  XLSX.utils.book_append_sheet(workbook, unitsSheet, "Valid Units")
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions")
  XLSX.writeFile(workbook, filename)
}

export async function downloadItemExcelTemplate(filename = "item_template.xlsx", godownNames: string[] = []) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "businessOs-app"
  workbook.created = new Date()

  const sheet = workbook.addWorksheet("Items", {
    views: [{ state: "frozen", ySplit: 1 }],
  })

  // Hidden sheet to power dropdowns
  const lists = workbook.addWorksheet("Lists")
  lists.state = "veryHidden"

  const headers = [
    "Item Name",
    "HSN Code",
    "Barcode No",
    "Unit",
    "Conversion Rate",
    "Alternate Unit",
    "Purchase Price",
    "Sale Price",
    "Wholesale Price",
    "Quantity Price",
    "MRP",
    "Stock",
    "Min Stock",
    "Max Stock",
    "Per Carton Qty",
    "Godown",
    "GST Rate (%)",
    "Cess Rate (%)",
  ]

  sheet.addRow(headers)

  // Example row
  sheet.addRow([
    "Example Item",
    "8471",
    "",
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
    12,
    "",
    18,
    0,
  ])

  // Column widths (roughly matching old template)
  sheet.columns = [
    { width: 20 },
    { width: 12 },
    { width: 15 },
    { width: 10 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
    { width: 15 },
    { width: 18 },
    { width: 12 },
    { width: 12 },
  ]

  // Make header row bold
  sheet.getRow(1).font = { bold: true }

  const units = ["PCS", "KG", "LTR", "MTR", "BOX", "DOZEN"]
  const gstRates = [0, 3, 5, 12, 18, 28]

  // Populate lists sheet
  lists.getCell("A1").value = "Units"
  units.forEach((u, idx) => {
    lists.getCell(`A${idx + 2}`).value = u
  })

  lists.getCell("B1").value = "GSTRates"
  gstRates.forEach((g, idx) => {
    lists.getCell(`B${idx + 2}`).value = g
  })

  lists.getCell("C1").value = "Godowns"
  const uniqueGodowns = Array.from(new Set(godownNames.map((n) => n.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  uniqueGodowns.forEach((name, idx) => {
    lists.getCell(`C${idx + 2}`).value = name
  })

  // Apply dropdown validations to a reasonable range
  const startRow = 2
  const endRow = 1000

  // unit column = D
  for (let r = startRow; r <= endRow; r++) {
    sheet.getCell(`D${r}`).dataValidation = {
      type: "list",
      allowBlank: false,
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid Unit",
      error: "Please select a unit from the dropdown.",
      formulae: ["Lists!$A$2:$A$7"],
    }
  }

  // godown column = P
  if (uniqueGodowns.length > 0) {
    for (let r = startRow; r <= endRow; r++) {
      sheet.getCell(`P${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "Invalid Godown",
        error: "Please select a godown from the dropdown.",
        formulae: [`Lists!$C$2:$C$${uniqueGodowns.length + 1}`],
      }
    }
  }

  // gstRate column = Q
  for (let r = startRow; r <= endRow; r++) {
    sheet.getCell(`Q${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid GST Rate",
      error: "Please select a GST rate from the dropdown.",
      formulae: ["Lists!$B$2:$B$7"],
    }
  }

  // Helpful note row is already present; keep file simple/minimal
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export async function exportItemsToExcel(items: any[], filename = "items_export.xlsx", godownNames: string[] = []) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "businessOs-app"
  workbook.created = new Date()

  const sheet = workbook.addWorksheet("Items", {
    views: [{ state: "frozen", ySplit: 1 }],
  })

  // Hidden sheet to power dropdowns
  const lists = workbook.addWorksheet("Lists")
  lists.state = "veryHidden"

  const headers = [
    "ID",
    "Item Code",
    "Item Name",
    "Category",
    "HSN Code",
    "Barcode No",
    "Unit",
    "Conversion Rate",
    "Alternate Unit",
    "Purchase Price",
    "Sale Price",
    "Wholesale Price",
    "Quantity Price",
    "MRP",
    "Discount Type",
    "Sale Discount",
    "Stock",
    "Min Stock",
    "Max Stock",
    "Item Location",
    "Godown",
    "Per Carton Qty",
    "GST Rate (%)",
    "Tax Rate (%)",
    "Cess Rate (%)",
    "Inclusive of Tax",
  ]

  sheet.addRow(headers)

  // Add all items as rows
  items.forEach((item) => {
    sheet.addRow([
      item.id,
      item.itemCode || "",
      item.name,
      item.category || "",
      item.hsnCode || "",
      item.barcodeNo || "",
      item.unit || "PCS",
      item.conversionRate || 1,
      item.alternateUnit || "",
      item.purchasePrice || 0,
      item.salePrice || 0,
      item.wholesalePrice || 0,
      item.quantityPrice || 0,
      item.mrp || 0,
      item.discountType || "percentage",
      item.saleDiscount || 0,
      item.stock || 0,
      item.minStock || 0,
      item.maxStock || 0,
      item.itemLocation || "",
      item.godownName || "",
      item.perCartonQuantity || "",
      item.gstRate || 18,
      item.taxRate || item.gstRate || 18,
      item.cessRate || 0,
      item.inclusiveOfTax ? "Yes" : "No",
    ])
  })

  // Column widths
  sheet.columns = [
    { width: 38 }, // ID (UUID)
    { width: 12 }, // Item Code
    { width: 25 }, // Item Name
    { width: 15 }, // Category
    { width: 12 }, // HSN Code
    { width: 15 }, // Barcode No
    { width: 10 }, // Unit
    { width: 15 }, // Conversion Rate
    { width: 15 }, // Alternate Unit
    { width: 15 }, // Purchase Price
    { width: 15 }, // Sale Price
    { width: 15 }, // Wholesale Price
    { width: 15 }, // Quantity Price
    { width: 12 }, // MRP
    { width: 15 }, // Discount Type
    { width: 15 }, // Sale Discount
    { width: 10 }, // Stock
    { width: 12 }, // Min Stock
    { width: 12 }, // Max Stock
    { width: 15 }, // Item Location
    { width: 18 }, // Godown
    { width: 15 }, // Per Carton Qty
    { width: 12 }, // GST Rate
    { width: 12 }, // Tax Rate
    { width: 12 }, // Cess Rate
    { width: 15 }, // Inclusive of Tax
  ]

  // Make header row bold and freeze it
  sheet.getRow(1).font = { bold: true }

  const units = ["PCS", "KG", "LTR", "MTR", "BOX", "DOZEN"]
  const gstRates = [0, 3, 5, 12, 18, 28]
  const discountTypes = ["percentage", "flat"]

  // Populate lists sheet
  lists.getCell("A1").value = "Units"
  units.forEach((u, idx) => {
    lists.getCell(`A${idx + 2}`).value = u
  })

  lists.getCell("B1").value = "GSTRates"
  gstRates.forEach((g, idx) => {
    lists.getCell(`B${idx + 2}`).value = g
  })

  lists.getCell("C1").value = "DiscountTypes"
  discountTypes.forEach((d, idx) => {
    lists.getCell(`C${idx + 2}`).value = d
  })

  lists.getCell("D1").value = "YesNo"
  lists.getCell("D2").value = "Yes"
  lists.getCell("D3").value = "No"

  lists.getCell("E1").value = "Godowns"
  const uniqueGodowns = Array.from(new Set(godownNames.map((n) => n.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  uniqueGodowns.forEach((name, idx) => {
    lists.getCell(`E${idx + 2}`).value = name
  })

  // Apply dropdown validations
  const startRow = 2
  const endRow = items.length + 100 // Allow for new rows

  // Unit column = G
  for (let r = startRow; r <= endRow; r++) {
    sheet.getCell(`G${r}`).dataValidation = {
      type: "list",
      allowBlank: false,
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid Unit",
      error: "Please select a unit from the dropdown.",
      formulae: ["Lists!$A$2:$A$7"],
    }
  }

  // Godown column = U
  if (uniqueGodowns.length > 0) {
    for (let r = startRow; r <= endRow; r++) {
      sheet.getCell(`U${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "Invalid Godown",
        error: "Please select a godown from the dropdown.",
        formulae: [`Lists!$E$2:$E$${uniqueGodowns.length + 1}`],
      }
    }
  }

  // Discount Type column = O
  for (let r = startRow; r <= endRow; r++) {
    sheet.getCell(`O${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid Discount Type",
      error: "Please select percentage or flat.",
      formulae: ["Lists!$C$2:$C$3"],
    }
  }

  // GST Rate column = W
  for (let r = startRow; r <= endRow; r++) {
    sheet.getCell(`W${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid GST Rate",
      error: "Please select a GST rate from the dropdown.",
      formulae: ["Lists!$B$2:$B$7"],
    }
  }

  // Inclusive of Tax column = Z
  for (let r = startRow; r <= endRow; r++) {
    sheet.getCell(`Z${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid Value",
      error: "Please select Yes or No.",
      formulae: ["Lists!$D$2:$D$3"],
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export async function downloadCustomerExcelTemplate(filename = "customer_template.xlsx") {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "businessOs-app"
  workbook.created = new Date()

  const sheet = workbook.addWorksheet("Customers", {
    views: [{ state: "frozen", ySplit: 1 }],
  })

  sheet.addRow([
    "Customer Name",
    "Contact No",
    "Email",
    "Address",
    "Opening Balance",
    "Opening Date",
    "GSTIN No",
  ])

  sheet.addRow([
    "Example Customer",
    "9876543210",
    "example@email.com",
    "Address line 1",
    0,
    new Date(),
    "",
  ])

  sheet.columns = [
    { width: 22 },
    { width: 14 },
    { width: 24 },
    { width: 32 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
  ]

  sheet.getRow(1).font = { bold: true }
  sheet.getColumn(6).numFmt = "yyyy-mm-dd"

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
