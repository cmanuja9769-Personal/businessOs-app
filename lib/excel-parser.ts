import ExcelJS from "exceljs"
import type { IItem } from "@/types"

export interface ParsedRow {
  [key: string]: string | number | Date | null
}

function trimTrailingUnderscores(s: string): string {
  let end = s.length
  while (end > 0 && s[end - 1] === "_") end--
  return s.slice(0, end)
}

function normalizeHeader(header: string): string {
  const cleaned = header
    .trim()
    .toLowerCase()
    .replace(/\([^()]*\)/g, "")
    .replace(/%/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+/, "")
  return trimTrailingUnderscores(cleaned)
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
    description: "description",
    item_description: "description",
    details: "description",
    category: "category",
    item_category: "category",
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
    per_packaging_qty: "perCartonQuantity",
    perpackagingqty: "perCartonQuantity",
    packaging_qty: "perCartonQuantity",
    packaging_unit: "packagingUnit",
    packagingunit: "packagingUnit",
    packaging: "packagingUnit",
    unit_base: "unit",
    unitbase: "unit",
    base_unit: "unit",
    baseunit: "unit",
    stock_in_packaging: "stock",
    stockinpackaging: "stock",
    min_stock_pkg: "minStock",
    minstockpkg: "minStock",
    max_stock_pkg: "maxStock",
    maxstockpkg: "maxStock",
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

export async function parseExcelFile(file: File): Promise<ParsedRow[]> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new Error("No worksheet found in file")
  }

  const rows: ParsedRow[] = []
  const headers: string[] = []

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = normalizeHeader(String(cell.value || ""))
      })
    } else {
      const rowData: ParsedRow = {}
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1]
        if (header) {
          rowData[header] = cell.value as string | number | Date | null
        }
      })
      if (Object.keys(rowData).length > 0) {
        rows.push(rowData)
      }
    }
  })

  return rows.map(remapRowKeys)
}

export async function downloadExcelTemplate(headers: string[], filename: string) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "businessOs-app"
  workbook.created = new Date()

  const itemsSheet = workbook.addWorksheet("Items")
  itemsSheet.addRow(headers)
  itemsSheet.addRow([
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
  ])

  itemsSheet.columns = [
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
    { width: 12 },
    { width: 12 },
  ]

  const unitsSheet = workbook.addWorksheet("Valid Units")
  unitsSheet.addRows([
    ["Valid Units"],
    ["PCS - Pieces"],
    ["KG - Kilogram"],
    ["LTR - Liter"],
    ["MTR - Meter"],
    ["BOX - Box"],
    ["DOZEN - Dozen"],
    ["PKT - Packet"],
    ["BAG - Bag"],
  ])

  const instructionsSheet = workbook.addWorksheet("Instructions")
  instructionsSheet.addRows([
    ["Instructions for Bulk Upload"],
    [""],
    ["1. Fill in all required fields (marked with *)"],
    ["2. Unit must be one of: PCS, KG, LTR, MTR, BOX, DOZEN, PKT, BAG (case-insensitive)"],
    ["3. Prices should be in numbers (e.g., 100.50)"],
    ["4. Stock quantities should be whole numbers"],
    ["5. GST Rate should be between 0-100"],
    [""],
    ["Column Descriptions:"],
    ["- name: Item name (required)"],
    ["- hsnCode: HSN/SAC code (optional)"],
    ["- barcodeNo: Barcode number (optional) - Enter manually (EAN-13, EAN-8, UPC-A, or custom) OR leave empty for auto-generation (BAR000001, BAR000002, etc.)"],
    ["- unit: Unit of measurement - use dropdown or type: PCS, KG, LTR, MTR, BOX, DOZEN, PKT, BAG"],
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

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
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
    "Description",
    "Category",
    "HSN Code",
    "Barcode No",
    "Unit (Base)",           // Base unit (PCS, KG, etc.)
    "Packaging Unit",        // Packaging unit (CTN, GONI, BAG, etc.)
    "Per Packaging Qty",     // How many base units in 1 packaging unit
    "Conversion Rate",
    "Alternate Unit",
    "Purchase Price",
    "Sale Price",
    "Wholesale Price",
    "Quantity Price",
    "MRP",
    "Stock (in Packaging)",  // Stock is in packaging units
    "Min Stock (Pkg)",       // Min stock in packaging units
    "Max Stock (Pkg)",       // Max stock in packaging units
    "Godown",
    "GST Rate (%)",
    "Cess Rate (%)",
  ]

  sheet.addRow(headers)

  // Example row - Updated for packaging unit system
  sheet.addRow([
    "Example Item",
    "Detailed description of the item",
    "Electronics",
    "8471",
    "",
    "PCS",        // Base unit
    "CTN",        // Packaging unit
    12,           // Per packaging qty (1 CTN = 12 PCS)
    1,            // Conversion rate
    "",           // Alternate unit
    100,          // Purchase price
    150,          // Sale price
    140,          // Wholesale price
    130,          // Quantity price
    160,          // MRP
    50,           // Stock in packaging units (50 CTN)
    10,           // Min stock in packaging units
    100,          // Max stock in packaging units
    "",           // Godown
    18,           // GST rate
    0,            // Cess rate
  ])

  // Column widths (updated for new column structure)
  sheet.columns = [
    { width: 20 },  // Item Name
    { width: 30 },  // Description
    { width: 15 },  // Category
    { width: 12 },  // HSN Code
    { width: 15 },  // Barcode No
    { width: 12 },  // Unit (Base)
    { width: 15 },  // Packaging Unit
    { width: 16 },  // Per Packaging Qty
    { width: 15 },  // Conversion Rate
    { width: 15 },  // Alternate Unit
    { width: 15 },  // Purchase Price
    { width: 15 },  // Sale Price
    { width: 15 },  // Wholesale Price
    { width: 15 },  // Quantity Price
    { width: 12 },  // MRP
    { width: 16 },  // Stock (in Packaging)
    { width: 14 },  // Min Stock (Pkg)
    { width: 14 },  // Max Stock (Pkg)
    { width: 18 },  // Godown
    { width: 12 },  // GST Rate
    { width: 12 },  // Cess Rate
  ]

  // Make header row bold
  sheet.getRow(1).font = { bold: true }

  // Base units for Unit column
  const baseUnits = ["PCS", "KG", "LTR", "MTR", "BOX", "DOZEN", "PKT", "BAG"]
  // Packaging units for Packaging Unit column  
  const packagingUnits = ["CTN", "GONI", "BAG", "BUNDLE", "PKT", "BOX", "CASE", "ROLL", "DRUM"]
  const gstRates = [0, 3, 5, 12, 18, 28]

  // Populate lists sheet
  lists.getCell("A1").value = "BaseUnits"
  baseUnits.forEach((u, idx) => {
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

  lists.getCell("D1").value = "PackagingUnits"
  packagingUnits.forEach((u, idx) => {
    lists.getCell(`D${idx + 2}`).value = u
  })

  // Apply dropdown validations to a reasonable range
  const startRow = 2
  const endRow = 1000

  // Base Unit column = F (column 6)
  for (let r = startRow; r <= endRow; r++) {
    sheet.getCell(`F${r}`).dataValidation = {
      type: "list",
      allowBlank: false,
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid Unit",
      error: "Please select a base unit from the dropdown (PCS, KG, LTR, etc.).",
      formulae: [`Lists!$A$2:$A$${baseUnits.length + 1}`],
    }
  }

  // Packaging Unit column = G (column 7)
  for (let r = startRow; r <= endRow; r++) {
    sheet.getCell(`G${r}`).dataValidation = {
      type: "list",
      allowBlank: false,
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid Packaging Unit",
      error: "Please select a packaging unit from the dropdown (CTN, GONI, BAG, etc.).",
      formulae: [`Lists!$D$2:$D$${packagingUnits.length + 1}`],
    }
  }

  // Godown column = S (column 19)
  if (uniqueGodowns.length > 0) {
    for (let r = startRow; r <= endRow; r++) {
      sheet.getCell(`S${r}`).dataValidation = {
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

  // GST Rate column = T (column 20)
  for (let r = startRow; r <= endRow; r++) {
    sheet.getCell(`T${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid GST Rate",
      error: "Please select a GST rate from the dropdown.",
      formulae: [`Lists!$B$2:$B$${gstRates.length + 1}`],
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

export async function exportItemsToExcel(items: IItem[], filename = "items_export.xlsx", godownNames: string[] = []) {
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
    "Description",
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
      item.description || "",
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
    { width: 30 }, // Description
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

  const units = ["PCS", "KG", "LTR", "MTR", "BOX", "DOZEN", "PKT", "BAG"]
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
      formulae: ["Lists!$A$2:$A$9"],
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
