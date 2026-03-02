import type { ICustomer, IItem, IInvoice, IInvoiceItem, IPurchase, IPurchaseItem, ISupplier, IPayment, IBarcodePrintLog } from "@/types"
import type { Warehouse } from "@/app/godowns/actions"

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(10, 0, 0, 0)
  return d
}

function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(10, 0, 0, 0)
  return d
}

const today = new Date()
const _todayStr = today.toISOString().split("T")[0]

const W1 = "d1000000-0000-4000-a000-000000000001"
const W2 = "d1000000-0000-4000-a000-000000000002"

export const demoWarehouses: Warehouse[] = [
  {
    id: W1,
    name: "Main Warehouse",
    code: "WH-MAIN",
    address: "No. 42, Industrial Area, Peenya, Bengaluru - 560058",
    phone: "080-26541234",
    contactPerson: "Rajesh Kumar",
    email: "main@techmart.in",
    capacityNotes: "2000 sq ft, climate controlled",
    isDefault: true,
    isActive: true,
    createdAt: daysAgo(180).toISOString(),
    updatedAt: daysAgo(2).toISOString(),
    stockCount: 1450,
    stockValue: 3245000,
    itemCount: 20,
  },
  {
    id: W2,
    name: "MG Road Showroom",
    code: "WH-MGR",
    address: "No. 18, MG Road, Bengaluru - 560001",
    phone: "080-25553456",
    contactPerson: "Priya Sharma",
    email: "showroom@techmart.in",
    capacityNotes: "500 sq ft, retail showroom storage",
    isDefault: false,
    isActive: true,
    createdAt: daysAgo(150).toISOString(),
    updatedAt: daysAgo(5).toISOString(),
    stockCount: 380,
    stockValue: 985000,
    itemCount: 15,
  },
]

const C = {
  c1: "d2000000-0000-4000-a000-000000000001",
  c2: "d2000000-0000-4000-a000-000000000002",
  c3: "d2000000-0000-4000-a000-000000000003",
  c4: "d2000000-0000-4000-a000-000000000004",
  c5: "d2000000-0000-4000-a000-000000000005",
  c6: "d2000000-0000-4000-a000-000000000006",
  c7: "d2000000-0000-4000-a000-000000000007",
  c8: "d2000000-0000-4000-a000-000000000008",
  c9: "d2000000-0000-4000-a000-000000000009",
  c10: "d2000000-0000-4000-a000-000000000010",
}

export const demoCustomers: ICustomer[] = [
{ id: C.c1, name: "Ananya Enterprises", contactNo: "9876543210", email: "ananya@enterprises.in", address: "56, Jayanagar 4th Block, Bengaluru - 560041", openingBalance: 15000, openingDate: daysAgo(120), gstinNo: "29AAMCA5678B1ZT", createdAt: daysAgo(120), updatedAt: daysAgo(3) },
  { id: C.c2, name: "Sri Lakshmi Traders", contactNo: "9845123789", email: "lakshmi.traders@gmail.com", address: "12, Avenue Road, Bengaluru - 560002", openingBalance: 0, openingDate: daysAgo(90), gstinNo: "29AAFCS1234M1ZP", createdAt: daysAgo(90), updatedAt: daysAgo(7) },
  { id: C.c3, name: "Deepak Patel", contactNo: "8765432190", email: "deepak.p@outlook.com", address: "Flat 302, Prestige Towers, Whitefield, Bengaluru - 560066", openingBalance: 0, openingDate: daysAgo(60), createdAt: daysAgo(60), updatedAt: daysAgo(14) },
  { id: C.c4, name: "NexGen IT Solutions Pvt Ltd", contactNo: "9988776655", email: "procurement@nexgenit.com", address: "3rd Floor, Tech Park, Electronic City, Bengaluru - 560100", openingBalance: 50000, openingDate: daysAgo(100), gstinNo: "29AABCN9876G2Z5", createdAt: daysAgo(100), updatedAt: daysAgo(1) },
  { id: C.c5, name: "Meera Krishnamurthy", contactNo: "7654321098", email: "meera.k@yahoo.com", address: "22, Koramangala 5th Block, Bengaluru - 560095", openingBalance: 0, openingDate: daysAgo(45), createdAt: daysAgo(45), updatedAt: daysAgo(22) },
  { id: C.c6, name: "Karnataka State IT Dept", contactNo: "080-22251234", email: "itdept@karnataka.gov.in", address: "MS Building, Ambedkar Veedhi, Bengaluru - 560001", openingBalance: 0, openingDate: daysAgo(80), gstinNo: "29AAAGK4567H1Z3", createdAt: daysAgo(80), updatedAt: daysAgo(10) },
  { id: C.c7, name: "Ravi Mobile Hub", contactNo: "9123456789", email: "ravimobilehub@gmail.com", address: "SP Road, Bengaluru - 560053", openingBalance: 5000, openingDate: daysAgo(70), gstinNo: "29AADCR2345J1Z8", createdAt: daysAgo(70), updatedAt: daysAgo(5) },
  { id: C.c8, name: "Fresher Academy", contactNo: "8899776655", email: "admin@fresheracademy.in", address: "HSR Layout, Sector 1, Bengaluru - 560102", openingBalance: 0, openingDate: daysAgo(30), gstinNo: "29AABCF3456K1ZQ", createdAt: daysAgo(30), updatedAt: daysAgo(8) },
  { id: C.c9, name: "Walk-in Customer", contactNo: "", address: "", openingBalance: 0, openingDate: daysAgo(180), createdAt: daysAgo(180), updatedAt: daysAgo(1) },
  { id: C.c10, name: "Suresh Babu", contactNo: "9876501234", email: "suresh.babu@gmail.com", address: "BTM Layout 2nd Stage, Bengaluru - 560076", openingBalance: 0, openingDate: daysAgo(15), createdAt: daysAgo(15), updatedAt: daysAgo(2) },
]

const S = {
  s1: "d3000000-0000-4000-a000-000000000001",
  s2: "d3000000-0000-4000-a000-000000000002",
  s3: "d3000000-0000-4000-a000-000000000003",
  s4: "d3000000-0000-4000-a000-000000000004",
  s5: "d3000000-0000-4000-a000-000000000005",
  s6: "d3000000-0000-4000-a000-000000000006",
}

export const demoSuppliers: ISupplier[] = [
  { id: S.s1, name: "Samsung India Electronics Pvt Ltd", contactNo: "1800-40-7267", email: "business@samsung.in", address: "Samsung Hub, Sector 44, Gurugram, Haryana - 122003", gstinNo: "06AABCS5678K1Z2", createdAt: daysAgo(180), updatedAt: daysAgo(10) },
  { id: S.s2, name: "Apple India Pvt Ltd", contactNo: "1800-4250-744", email: "india.sales@apple.com", address: "Apple India, BKC, Mumbai, Maharashtra - 400051", gstinNo: "27AACCA1234L1Z9", createdAt: daysAgo(180), updatedAt: daysAgo(15) },
  { id: S.s3, name: "Dell Technologies India", contactNo: "1800-425-4026", email: "sales.india@dell.com", address: "Dell India, Outer Ring Rd, Bengaluru - 560103", gstinNo: "29AACCD5678M1Z6", createdAt: daysAgo(160), updatedAt: daysAgo(8) },
  { id: S.s4, name: "Lenovo India Pvt Ltd", contactNo: "1800-419-4666", email: "contact@lenovo.co.in", address: "Lenovo India, DLF Cyber City, Gurugram - 122002", gstinNo: "06AABCL9876N1Z3", createdAt: daysAgo(150), updatedAt: daysAgo(20) },
  { id: S.s5, name: "Boat Lifestyle", contactNo: "9999888877", email: "wholesale@boat.in", address: "boAt Lifestyle, Andheri West, Mumbai - 400053", gstinNo: "27AACIB2345P1Z4", createdAt: daysAgo(120), updatedAt: daysAgo(12) },
  { id: S.s6, name: "Logitech India Pvt Ltd", contactNo: "080-46552222", email: "india.channel@logitech.com", address: "Logitech India, Embassy Golf Links, Bengaluru - 560071", gstinNo: "29AABCL6789Q1Z1", createdAt: daysAgo(140), updatedAt: daysAgo(3) },
]

const I = {
  i1: "d4000000-0000-4000-a000-000000000001",
  i2: "d4000000-0000-4000-a000-000000000002",
  i3: "d4000000-0000-4000-a000-000000000003",
  i4: "d4000000-0000-4000-a000-000000000004",
  i5: "d4000000-0000-4000-a000-000000000005",
  i6: "d4000000-0000-4000-a000-000000000006",
  i7: "d4000000-0000-4000-a000-000000000007",
  i8: "d4000000-0000-4000-a000-000000000008",
  i9: "d4000000-0000-4000-a000-000000000009",
  i10: "d4000000-0000-4000-a000-000000000010",
  i11: "d4000000-0000-4000-a000-000000000011",
  i12: "d4000000-0000-4000-a000-000000000012",
  i13: "d4000000-0000-4000-a000-000000000013",
  i14: "d4000000-0000-4000-a000-000000000014",
  i15: "d4000000-0000-4000-a000-000000000015",
  i16: "d4000000-0000-4000-a000-000000000016",
  i17: "d4000000-0000-4000-a000-000000000017",
  i18: "d4000000-0000-4000-a000-000000000018",
  i19: "d4000000-0000-4000-a000-000000000019",
  i20: "d4000000-0000-4000-a000-000000000020",
}

export const demoItems: IItem[] = [
  { id: I.i1, itemCode: "SAM-S24-256", name: "Samsung Galaxy S24 Ultra 256GB", category: "Smartphones", hsnCode: "8517", barcodeNo: "8806095678901", unit: "PCS", conversionRate: 1, purchasePrice: 89990, salePrice: 109999, mrp: 129999, stock: 18, minStock: 5, maxStock: 50, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(60), updatedAt: daysAgo(2), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws1", itemId: I.i1, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 12, minQuantity: 3 }, { id: "ws2", itemId: I.i1, warehouseId: W2, warehouseName: "MG Road Showroom", quantity: 6, minQuantity: 2 }] },
  { id: I.i2, itemCode: "APL-IPH15P-128", name: "Apple iPhone 15 Pro 128GB", category: "Smartphones", hsnCode: "8517", barcodeNo: "1234567890123", unit: "PCS", conversionRate: 1, purchasePrice: 104900, salePrice: 129900, mrp: 134900, stock: 12, minStock: 3, maxStock: 30, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(55), updatedAt: daysAgo(1), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws3", itemId: I.i2, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 8, minQuantity: 2 }, { id: "ws4", itemId: I.i2, warehouseId: W2, warehouseName: "MG Road Showroom", quantity: 4, minQuantity: 1 }] },
  { id: I.i3, itemCode: "DEL-INS15-I5", name: "Dell Inspiron 15 i5/8GB/512GB", category: "Laptops", hsnCode: "8471", barcodeNo: "2345678901234", unit: "PCS", conversionRate: 1, purchasePrice: 48500, salePrice: 59990, mrp: 64999, stock: 8, minStock: 3, maxStock: 20, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(90), updatedAt: daysAgo(5), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws5", itemId: I.i3, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 6, minQuantity: 2 }, { id: "ws6", itemId: I.i3, warehouseId: W2, warehouseName: "MG Road Showroom", quantity: 2, minQuantity: 1 }] },
  { id: I.i4, itemCode: "LEN-TP14-I7", name: "Lenovo ThinkPad T14 i7/16GB/512GB", category: "Laptops", hsnCode: "8471", barcodeNo: "3456789012345", unit: "PCS", conversionRate: 1, purchasePrice: 72000, salePrice: 89990, mrp: 96999, stock: 5, minStock: 2, maxStock: 15, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(80), updatedAt: daysAgo(3), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws7", itemId: I.i4, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 5, minQuantity: 2 }] },
  { id: I.i5, itemCode: "SAM-TAB-S9", name: "Samsung Galaxy Tab S9 128GB", category: "Tablets", hsnCode: "8471", barcodeNo: "4567890123456", unit: "PCS", conversionRate: 1, purchasePrice: 52000, salePrice: 64999, mrp: 74999, stock: 10, minStock: 3, maxStock: 20, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(50), updatedAt: daysAgo(4), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws8", itemId: I.i5, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 7, minQuantity: 2 }, { id: "ws9", itemId: I.i5, warehouseId: W2, warehouseName: "MG Road Showroom", quantity: 3, minQuantity: 1 }] },
  { id: I.i6, itemCode: "BOA-AIRDP-600", name: "boAt Airdopes 600 ANC", category: "Audio", hsnCode: "8518", barcodeNo: "5678901234567", unit: "PCS", conversionRate: 1, purchasePrice: 2200, salePrice: 3499, mrp: 4490, stock: 45, minStock: 10, maxStock: 100, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(40), updatedAt: daysAgo(1), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws10", itemId: I.i6, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 30, minQuantity: 5 }, { id: "ws11", itemId: I.i6, warehouseId: W2, warehouseName: "MG Road Showroom", quantity: 15, minQuantity: 5 }] },
  { id: I.i7, itemCode: "LOG-MX3S", name: "Logitech MX Master 3S Mouse", category: "Accessories", hsnCode: "8471", barcodeNo: "6789012345678", unit: "PCS", conversionRate: 1, purchasePrice: 5800, salePrice: 7999, mrp: 8999, stock: 22, minStock: 5, maxStock: 50, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(70), updatedAt: daysAgo(6), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws12", itemId: I.i7, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 15, minQuantity: 3 }, { id: "ws13", itemId: I.i7, warehouseId: W2, warehouseName: "MG Road Showroom", quantity: 7, minQuantity: 2 }] },
  { id: I.i8, itemCode: "LOG-K855", name: "Logitech K855 Mechanical Keyboard", category: "Accessories", hsnCode: "8471", barcodeNo: "7890123456789", unit: "PCS", conversionRate: 1, purchasePrice: 6200, salePrice: 8499, mrp: 9499, stock: 15, minStock: 5, maxStock: 40, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(65), updatedAt: daysAgo(8), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws14", itemId: I.i8, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 10, minQuantity: 3 }, { id: "ws15", itemId: I.i8, warehouseId: W2, warehouseName: "MG Road Showroom", quantity: 5, minQuantity: 2 }] },
  { id: I.i9, itemCode: "SAM-CRG-25W", name: "Samsung 25W Fast Charger", category: "Chargers & Cables", hsnCode: "8504", barcodeNo: "8901234567890", unit: "PCS", conversionRate: 1, purchasePrice: 800, salePrice: 1299, mrp: 1499, stock: 60, minStock: 15, maxStock: 200, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(30), updatedAt: daysAgo(2), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws16", itemId: I.i9, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 40, minQuantity: 10 }, { id: "ws17", itemId: I.i9, warehouseId: W2, warehouseName: "MG Road Showroom", quantity: 20, minQuantity: 5 }] },
  { id: I.i10, itemCode: "APL-ACRG-20W", name: "Apple 20W USB-C Power Adapter", category: "Chargers & Cables", hsnCode: "8504", barcodeNo: "9012345678901", unit: "PCS", conversionRate: 1, purchasePrice: 1200, salePrice: 1899, mrp: 1900, stock: 35, minStock: 10, maxStock: 100, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(50), updatedAt: daysAgo(3), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws18", itemId: I.i10, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 25, minQuantity: 5 }, { id: "ws19", itemId: I.i10, warehouseId: W2, warehouseName: "MG Road Showroom", quantity: 10, minQuantity: 5 }] },
  { id: I.i11, itemCode: "USC-CBL-1M", name: "USB-C to USB-C Cable 1m (Premium)", category: "Chargers & Cables", hsnCode: "8544", barcodeNo: "0123456789012", unit: "PCS", conversionRate: 1, purchasePrice: 250, salePrice: 499, mrp: 599, stock: 120, minStock: 30, maxStock: 300, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(45), updatedAt: daysAgo(1), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws20", itemId: I.i11, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 80, minQuantity: 20 }, { id: "ws21", itemId: I.i11, warehouseId: W2, warehouseName: "MG Road Showroom", quantity: 40, minQuantity: 10 }] },
  { id: I.i12, itemCode: "SAM-MON-27", name: "Samsung 27\" 4K Monitor LS27", category: "Monitors", hsnCode: "8528", barcodeNo: "1122334455667", unit: "PCS", conversionRate: 1, purchasePrice: 22000, salePrice: 28999, mrp: 32999, stock: 6, minStock: 2, maxStock: 15, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(40), updatedAt: daysAgo(7), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws22", itemId: I.i12, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 6, minQuantity: 2 }] },
  { id: I.i13, itemCode: "DEL-MON-24", name: "Dell 24\" FHD Monitor SE2422H", category: "Monitors", hsnCode: "8528", barcodeNo: "2233445566778", unit: "PCS", conversionRate: 1, purchasePrice: 10500, salePrice: 13999, mrp: 15499, stock: 9, minStock: 3, maxStock: 20, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(60), updatedAt: daysAgo(4), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws23", itemId: I.i13, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 7, minQuantity: 2 }, { id: "ws24", itemId: I.i13, warehouseId: W2, warehouseName: "MG Road Showroom", quantity: 2, minQuantity: 1 }] },
  { id: I.i14, itemCode: "BOA-ROCK-BS", name: "boAt Rockerz 450 Headphones", category: "Audio", hsnCode: "8518", barcodeNo: "3344556677889", unit: "PCS", conversionRate: 1, purchasePrice: 1100, salePrice: 1799, mrp: 2990, stock: 38, minStock: 10, maxStock: 80, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(35), updatedAt: daysAgo(2), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws25", itemId: I.i14, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 25, minQuantity: 5 }, { id: "ws26", itemId: I.i14, warehouseId: W2, warehouseName: "MG Road Showroom", quantity: 13, minQuantity: 5 }] },
  { id: I.i15, itemCode: "APL-APOD-3", name: "Apple AirPods 3rd Gen", category: "Audio", hsnCode: "8518", barcodeNo: "4455667788990", unit: "PCS", conversionRate: 1, purchasePrice: 14500, salePrice: 18900, mrp: 19900, stock: 14, minStock: 5, maxStock: 30, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(45), updatedAt: daysAgo(6), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws27", itemId: I.i15, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 10, minQuantity: 3 }, { id: "ws28", itemId: I.i15, warehouseId: W2, warehouseName: "MG Road Showroom", quantity: 4, minQuantity: 2 }] },
  { id: I.i16, itemCode: "SAM-SSD-1T", name: "Samsung 870 EVO 1TB SSD", category: "Storage", hsnCode: "8471", barcodeNo: "5566778899001", unit: "PCS", conversionRate: 1, purchasePrice: 5500, salePrice: 7499, mrp: 8499, stock: 20, minStock: 5, maxStock: 40, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(50), updatedAt: daysAgo(5), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws29", itemId: I.i16, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 20, minQuantity: 5 }] },
  { id: I.i17, itemCode: "LOG-C920-HD", name: "Logitech C920 HD Pro Webcam", category: "Accessories", hsnCode: "8525", barcodeNo: "6677889900112", unit: "PCS", conversionRate: 1, purchasePrice: 5200, salePrice: 7490, mrp: 8990, stock: 3, minStock: 5, maxStock: 20, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(55), updatedAt: daysAgo(10), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws30", itemId: I.i17, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 2, minQuantity: 3 }, { id: "ws31", itemId: I.i17, warehouseId: W2, warehouseName: "MG Road Showroom", quantity: 1, minQuantity: 2 }] },
  { id: I.i18, itemCode: "APL-WATCH-S9", name: "Apple Watch Series 9 45mm", category: "Wearables", hsnCode: "9102", barcodeNo: "7788990011223", unit: "PCS", conversionRate: 1, purchasePrice: 34000, salePrice: 44900, mrp: 49900, stock: 7, minStock: 3, maxStock: 15, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(30), updatedAt: daysAgo(3), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws32", itemId: I.i18, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 5, minQuantity: 2 }, { id: "ws33", itemId: I.i18, warehouseId: W2, warehouseName: "MG Road Showroom", quantity: 2, minQuantity: 1 }] },
  { id: I.i19, itemCode: "TMP-GLAS-IPH15", name: "Tempered Glass iPhone 15 Pro", category: "Accessories", hsnCode: "7007", barcodeNo: "8899001122334", unit: "PCS", conversionRate: 1, packagingUnit: "BOX", perCartonQuantity: 50, purchasePrice: 80, salePrice: 299, mrp: 499, stock: 200, minStock: 50, maxStock: 500, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(25), updatedAt: daysAgo(1), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws34", itemId: I.i19, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 150, minQuantity: 30 }, { id: "ws35", itemId: I.i19, warehouseId: W2, warehouseName: "MG Road Showroom", quantity: 50, minQuantity: 20 }] },
  { id: I.i20, itemCode: "PHN-CVR-UNIV", name: "Universal Silicone Phone Case", category: "Accessories", hsnCode: "3926", barcodeNo: "9900112233445", unit: "PCS", conversionRate: 1, packagingUnit: "BOX", perCartonQuantity: 100, purchasePrice: 45, salePrice: 199, mrp: 399, stock: 350, minStock: 80, maxStock: 600, gstRate: 18, cessRate: 0, taxRate: 18, createdAt: daysAgo(20), updatedAt: daysAgo(1), godownId: W1, godownName: "Main Warehouse", warehouseStocks: [{ id: "ws36", itemId: I.i20, warehouseId: W1, warehouseName: "Main Warehouse", quantity: 250, minQuantity: 50 }, { id: "ws37", itemId: I.i20, warehouseId: W2, warehouseName: "MG Road Showroom", quantity: 100, minQuantity: 30 }] },
]

const INV = {
  inv1: "d5000000-0000-4000-a000-000000000001",
  inv2: "d5000000-0000-4000-a000-000000000002",
  inv3: "d5000000-0000-4000-a000-000000000003",
  inv4: "d5000000-0000-4000-a000-000000000004",
  inv5: "d5000000-0000-4000-a000-000000000005",
  inv6: "d5000000-0000-4000-a000-000000000006",
  inv7: "d5000000-0000-4000-a000-000000000007",
  inv8: "d5000000-0000-4000-a000-000000000008",
  inv9: "d5000000-0000-4000-a000-000000000009",
  inv10: "d5000000-0000-4000-a000-000000000010",
  inv11: "d5000000-0000-4000-a000-000000000011",
  inv12: "d5000000-0000-4000-a000-000000000012",
  inv13: "d5000000-0000-4000-a000-000000000013",
  inv14: "d5000000-0000-4000-a000-000000000014",
  inv15: "d5000000-0000-4000-a000-000000000015",
}

function makeInvoice(
  id: string, invoiceNo: string, docType: IInvoice["documentType"], customerId: string, customerName: string,
  customerGst: string | undefined, invoiceDate: Date, dueDate: Date, items: IInvoiceItem[],
  paidAmount: number, status: IInvoice["status"], opts?: Partial<IInvoice>,
): IInvoice {
  const subtotal = items.reduce((s, it) => s + it.amount, 0)
  const totalGst = items.reduce((s, it) => s + (it.amount * it.gstRate / 100), 0)
  const cgst = totalGst / 2
  const sgst = totalGst / 2
  const total = Math.round(subtotal + totalGst)
  const balance = total - paidAmount
  return {
    id, invoiceNo, documentType: docType, customerId, customerName, customerGst,
    invoiceDate, dueDate, billingMode: "gst", pricingMode: "sale",
    items, subtotal, cgst, sgst, igst: 0, cess: 0, discount: 0, discountType: "flat",
    total, paidAmount, balance, status, gstEnabled: true,
    createdAt: invoiceDate, updatedAt: new Date(), ...opts,
  }
}

function invItem(itemId: string, name: string, hsn: string, qty: number, rate: number, gst: number): IInvoiceItem {
  return { itemId, itemName: name, hsnCode: hsn, quantity: qty, unit: "PCS", rate, gstRate: gst, cessRate: 0, discount: 0, amount: qty * rate }
}

export const demoInvoices: IInvoice[] = [
  makeInvoice(INV.inv1, "INV-2025-001", "invoice", C.c1, "Ananya Enterprises", "29AAMCA5678B1ZT", daysAgo(28), daysAgo(13), [invItem(I.i1, "Samsung Galaxy S24 Ultra 256GB", "8517", 3, 109999, 18), invItem(I.i9, "Samsung 25W Fast Charger", "8504", 3, 1299, 18)], 333896, "paid"),
  makeInvoice(INV.inv2, "INV-2025-002", "invoice", C.c4, "NexGen IT Solutions Pvt Ltd", "29AABCN9876G2Z5", daysAgo(25), daysAgo(10), [invItem(I.i3, "Dell Inspiron 15 i5/8GB/512GB", "8471", 5, 59990, 18), invItem(I.i7, "Logitech MX Master 3S Mouse", "8471", 5, 7999, 18), invItem(I.i8, "Logitech K855 Mechanical Keyboard", "8471", 5, 8499, 18)], 250000, "partial"),
  makeInvoice(INV.inv3, "INV-2025-003", "invoice", C.c3, "Deepak Patel", undefined, daysAgo(22), daysAgo(7), [invItem(I.i2, "Apple iPhone 15 Pro 128GB", "8517", 1, 129900, 18), invItem(I.i19, "Tempered Glass iPhone 15 Pro", "7007", 2, 299, 18)], 153228, "paid"),
  makeInvoice(INV.inv4, "INV-2025-004", "invoice", C.c6, "Karnataka State IT Dept", "29AAAGK4567H1Z3", daysAgo(20), daysAgo(5), [invItem(I.i4, "Lenovo ThinkPad T14 i7/16GB/512GB", "8471", 10, 89990, 18), invItem(I.i13, "Dell 24\" FHD Monitor SE2422H", "8528", 10, 13999, 18), invItem(I.i7, "Logitech MX Master 3S Mouse", "8471", 10, 7999, 18), invItem(I.i8, "Logitech K855 Mechanical Keyboard", "8471", 10, 8499, 18)], 0, "unpaid"),
  makeInvoice(INV.inv5, "INV-2025-005", "invoice", C.c7, "Ravi Mobile Hub", "29AADCR2345J1Z8", daysAgo(18), daysAgo(3), [invItem(I.i6, "boAt Airdopes 600 ANC", "8518", 20, 3499, 18), invItem(I.i14, "boAt Rockerz 450 Headphones", "8518", 15, 1799, 18)], 100000, "partial"),
  makeInvoice(INV.inv6, "INV-2025-006", "invoice", C.c2, "Sri Lakshmi Traders", "29AAFCS1234M1ZP", daysAgo(15), daysFromNow(0), [invItem(I.i9, "Samsung 25W Fast Charger", "8504", 30, 1299, 18), invItem(I.i11, "USB-C to USB-C Cable 1m (Premium)", "8544", 50, 499, 18)], 62929, "paid"),
  makeInvoice(INV.inv7, "INV-2025-007", "invoice", C.c5, "Meera Krishnamurthy", undefined, daysAgo(12), daysFromNow(3), [invItem(I.i18, "Apple Watch Series 9 45mm", "9102", 1, 44900, 18), invItem(I.i15, "Apple AirPods 3rd Gen", "8518", 1, 18900, 18)], 75264, "paid"),
  makeInvoice(INV.inv8, "INV-2025-008", "invoice", C.c8, "Fresher Academy", "29AABCF3456K1ZQ", daysAgo(10), daysFromNow(5), [invItem(I.i3, "Dell Inspiron 15 i5/8GB/512GB", "8471", 15, 59990, 18), invItem(I.i13, "Dell 24\" FHD Monitor SE2422H", "8528", 15, 13999, 18), invItem(I.i7, "Logitech MX Master 3S Mouse", "8471", 15, 7999, 18)], 500000, "partial"),
  makeInvoice(INV.inv9, "INV-2025-009", "invoice", C.c9, "Walk-in Customer", undefined, daysAgo(5), daysAgo(5), [invItem(I.i6, "boAt Airdopes 600 ANC", "8518", 1, 3499, 18), invItem(I.i20, "Universal Silicone Phone Case", "3926", 1, 199, 18)], 4363, "paid"),
  makeInvoice(INV.inv10, "INV-2025-010", "invoice", C.c10, "Suresh Babu", undefined, daysAgo(3), daysFromNow(12), [invItem(I.i12, "Samsung 27\" 4K Monitor LS27", "8528", 1, 28999, 18), invItem(I.i16, "Samsung 870 EVO 1TB SSD", "8471", 2, 7499, 18)], 0, "unpaid"),
  makeInvoice(INV.inv11, "INV-2025-011", "invoice", C.c1, "Ananya Enterprises", "29AAMCA5678B1ZT", daysAgo(1), daysFromNow(14), [invItem(I.i2, "Apple iPhone 15 Pro 128GB", "8517", 2, 129900, 18), invItem(I.i15, "Apple AirPods 3rd Gen", "8518", 2, 18900, 18)], 0, "unpaid"),
  makeInvoice(INV.inv12, "QUO-2025-001", "quotation", C.c4, "NexGen IT Solutions Pvt Ltd", "29AABCN9876G2Z5", daysAgo(7), daysFromNow(7), [invItem(I.i4, "Lenovo ThinkPad T14 i7/16GB/512GB", "8471", 20, 89990, 18), invItem(I.i12, "Samsung 27\" 4K Monitor LS27", "8528", 20, 28999, 18)], 0, "sent", { validityDate: daysFromNow(14) }),
  makeInvoice(INV.inv13, "SO-2025-001", "sales_order", C.c6, "Karnataka State IT Dept", "29AAAGK4567H1Z3", daysAgo(4), daysFromNow(10), [invItem(I.i3, "Dell Inspiron 15 i5/8GB/512GB", "8471", 25, 59990, 18), invItem(I.i17, "Logitech C920 HD Pro Webcam", "8525", 25, 7490, 18)], 0, "accepted"),
  makeInvoice(INV.inv14, "CN-2025-001", "credit_note", C.c3, "Deepak Patel", undefined, daysAgo(14), daysAgo(14), [invItem(I.i19, "Tempered Glass iPhone 15 Pro", "7007", 1, 299, 18)], 0, "paid", { parentDocumentId: INV.inv3 }),
  makeInvoice(INV.inv15, "INV-2025-012", "invoice", C.c9, "Walk-in Customer", undefined, daysAgo(0), daysAgo(0), [invItem(I.i1, "Samsung Galaxy S24 Ultra 256GB", "8517", 1, 109999, 18), invItem(I.i9, "Samsung 25W Fast Charger", "8504", 1, 1299, 18), invItem(I.i20, "Universal Silicone Phone Case", "3926", 1, 199, 18)], 131327, "paid"),
]

const PUR = {
  p1: "d6000000-0000-4000-a000-000000000001",
  p2: "d6000000-0000-4000-a000-000000000002",
  p3: "d6000000-0000-4000-a000-000000000003",
  p4: "d6000000-0000-4000-a000-000000000004",
  p5: "d6000000-0000-4000-a000-000000000005",
  p6: "d6000000-0000-4000-a000-000000000006",
  p7: "d6000000-0000-4000-a000-000000000007",
  p8: "d6000000-0000-4000-a000-000000000008",
  p9: "d6000000-0000-4000-a000-000000000009",
  p10: "d6000000-0000-4000-a000-000000000010",
}

function makePurchase(
  id: string, purchaseNo: string, supplierId: string, supplierName: string,
  supplierGst: string, date: Date, items: IPurchaseItem[],
  paidAmount: number, status: IPurchase["status"],
): IPurchase {
  const subtotal = items.reduce((s, it) => s + it.amount, 0)
  const totalTax = items.reduce((s, it) => s + (it.amount * it.taxRate / 100), 0)
  const cgst = totalTax / 2
  const sgst = totalTax / 2
  const total = Math.round(subtotal + totalTax)
  const balance = total - paidAmount
  return {
    id, purchaseNo, supplierId, supplierName, supplierGst,
    date, items, subtotal, discount: 0, discountType: "flat",
    cgst, sgst, igst: 0, total, paidAmount, balance, status,
    gstEnabled: true, createdAt: date, updatedAt: new Date(),
  }
}

function purItem(itemId: string, name: string, hsn: string, qty: number, rate: number, taxRate: number): IPurchaseItem {
  return { itemId, name, hsn, quantity: qty, rate, discount: 0, discountType: "flat", taxRate, amount: qty * rate }
}

export const demoPurchases: IPurchase[] = [
  makePurchase(PUR.p1, "PUR-2025-001", S.s1, "Samsung India Electronics Pvt Ltd", "06AABCS5678K1Z2", daysAgo(45), [purItem(I.i1, "Samsung Galaxy S24 Ultra 256GB", "8517", 25, 89990, 18), purItem(I.i9, "Samsung 25W Fast Charger", "8504", 100, 800, 18), purItem(I.i12, "Samsung 27\" 4K Monitor LS27", "8528", 10, 22000, 18)], 3127800, "paid"),
  makePurchase(PUR.p2, "PUR-2025-002", S.s2, "Apple India Pvt Ltd", "27AACCA1234L1Z9", daysAgo(42), [purItem(I.i2, "Apple iPhone 15 Pro 128GB", "8517", 20, 104900, 18), purItem(I.i10, "Apple 20W USB-C Power Adapter", "8504", 50, 1200, 18), purItem(I.i15, "Apple AirPods 3rd Gen", "8518", 20, 14500, 18)], 2000000, "partial"),
  makePurchase(PUR.p3, "PUR-2025-003", S.s3, "Dell Technologies India", "29AACCD5678M1Z6", daysAgo(38), [purItem(I.i3, "Dell Inspiron 15 i5/8GB/512GB", "8471", 30, 48500, 18), purItem(I.i13, "Dell 24\" FHD Monitor SE2422H", "8528", 20, 10500, 18)], 1924200, "paid"),
  makePurchase(PUR.p4, "PUR-2025-004", S.s4, "Lenovo India Pvt Ltd", "06AABCL9876N1Z3", daysAgo(35), [purItem(I.i4, "Lenovo ThinkPad T14 i7/16GB/512GB", "8471", 15, 72000, 18)], 1000000, "partial"),
  makePurchase(PUR.p5, "PUR-2025-005", S.s5, "Boat Lifestyle", "27AACIB2345P1Z4", daysAgo(30), [purItem(I.i6, "boAt Airdopes 600 ANC", "8518", 60, 2200, 18), purItem(I.i14, "boAt Rockerz 450 Headphones", "8518", 50, 1100, 18)], 220140, "paid"),
  makePurchase(PUR.p6, "PUR-2025-006", S.s6, "Logitech India Pvt Ltd", "29AABCL6789Q1Z1", daysAgo(25), [purItem(I.i7, "Logitech MX Master 3S Mouse", "8471", 30, 5800, 18), purItem(I.i8, "Logitech K855 Mechanical Keyboard", "8471", 25, 6200, 18), purItem(I.i17, "Logitech C920 HD Pro Webcam", "8525", 10, 5200, 18)], 400000, "partial"),
  makePurchase(PUR.p7, "PUR-2025-007", S.s1, "Samsung India Electronics Pvt Ltd", "06AABCS5678K1Z2", daysAgo(20), [purItem(I.i5, "Samsung Galaxy Tab S9 128GB", "8471", 15, 52000, 18), purItem(I.i16, "Samsung 870 EVO 1TB SSD", "8471", 30, 5500, 18)], 1114200, "paid"),
  makePurchase(PUR.p8, "PUR-2025-008", S.s2, "Apple India Pvt Ltd", "27AACCA1234L1Z9", daysAgo(15), [purItem(I.i18, "Apple Watch Series 9 45mm", "9102", 10, 34000, 18)], 0, "unpaid"),
  makePurchase(PUR.p9, "PUR-2025-009", S.s3, "Dell Technologies India", "29AACCD5678M1Z6", daysAgo(8), [purItem(I.i3, "Dell Inspiron 15 i5/8GB/512GB", "8471", 10, 48500, 18)], 572300, "paid"),
  makePurchase(PUR.p10, "PUR-2025-010", S.s5, "Boat Lifestyle", "27AACIB2345P1Z4", daysAgo(3), [purItem(I.i6, "boAt Airdopes 600 ANC", "8518", 40, 2200, 18), purItem(I.i14, "boAt Rockerz 450 Headphones", "8518", 30, 1100, 18)], 0, "unpaid"),
]

const PAY = {
  pay1: "d7000000-0000-4000-a000-000000000001",
  pay2: "d7000000-0000-4000-a000-000000000002",
  pay3: "d7000000-0000-4000-a000-000000000003",
  pay4: "d7000000-0000-4000-a000-000000000004",
  pay5: "d7000000-0000-4000-a000-000000000005",
  pay6: "d7000000-0000-4000-a000-000000000006",
  pay7: "d7000000-0000-4000-a000-000000000007",
  pay8: "d7000000-0000-4000-a000-000000000008",
  pay9: "d7000000-0000-4000-a000-000000000009",
  pay10: "d7000000-0000-4000-a000-000000000010",
  pay11: "d7000000-0000-4000-a000-000000000011",
  pay12: "d7000000-0000-4000-a000-000000000012",
  pay13: "d7000000-0000-4000-a000-000000000013",
  pay14: "d7000000-0000-4000-a000-000000000014",
  pay15: "d7000000-0000-4000-a000-000000000015",
  pay16: "d7000000-0000-4000-a000-000000000016",
  pay17: "d7000000-0000-4000-a000-000000000017",
  pay18: "d7000000-0000-4000-a000-000000000018",
  pay19: "d7000000-0000-4000-a000-000000000019",
  pay20: "d7000000-0000-4000-a000-000000000020",
}

export const demoPayments: IPayment[] = [
  { id: PAY.pay1, invoiceId: INV.inv1, type: "receivable", customerName: "Ananya Enterprises", paymentDate: daysAgo(27), amount: 200000, paymentMethod: "bank_transfer", referenceNumber: "NEFT-20250501", notes: "First installment", createdAt: daysAgo(27) },
  { id: PAY.pay2, invoiceId: INV.inv1, type: "receivable", customerName: "Ananya Enterprises", paymentDate: daysAgo(20), amount: 133896, paymentMethod: "bank_transfer", referenceNumber: "NEFT-20250508", notes: "Final payment", createdAt: daysAgo(20) },
  { id: PAY.pay3, invoiceId: INV.inv2, type: "receivable", customerName: "NexGen IT Solutions Pvt Ltd", paymentDate: daysAgo(22), amount: 250000, paymentMethod: "bank_transfer", referenceNumber: "RTGS-NX-001", notes: "Advance payment", createdAt: daysAgo(22) },
  { id: PAY.pay4, invoiceId: INV.inv3, type: "receivable", customerName: "Deepak Patel", paymentDate: daysAgo(22), amount: 153228, paymentMethod: "upi", referenceNumber: "UPI-DP-22MAY", createdAt: daysAgo(22) },
  { id: PAY.pay5, invoiceId: INV.inv5, type: "receivable", customerName: "Ravi Mobile Hub", paymentDate: daysAgo(17), amount: 50000, paymentMethod: "cash", createdAt: daysAgo(17) },
  { id: PAY.pay6, invoiceId: INV.inv5, type: "receivable", customerName: "Ravi Mobile Hub", paymentDate: daysAgo(10), amount: 50000, paymentMethod: "upi", referenceNumber: "UPI-RMH-10JUN", createdAt: daysAgo(10) },
  { id: PAY.pay7, invoiceId: INV.inv6, type: "receivable", customerName: "Sri Lakshmi Traders", paymentDate: daysAgo(14), amount: 62929, paymentMethod: "cheque", referenceNumber: "CHQ-456789", notes: "SBI cheque", createdAt: daysAgo(14) },
  { id: PAY.pay8, invoiceId: INV.inv7, type: "receivable", customerName: "Meera Krishnamurthy", paymentDate: daysAgo(12), amount: 75264, paymentMethod: "card", referenceNumber: "CARD-MK-12JUN", createdAt: daysAgo(12) },
  { id: PAY.pay9, invoiceId: INV.inv8, type: "receivable", customerName: "Fresher Academy", paymentDate: daysAgo(9), amount: 500000, paymentMethod: "bank_transfer", referenceNumber: "NEFT-FA-001", notes: "Partial - 50% advance", createdAt: daysAgo(9) },
  { id: PAY.pay10, invoiceId: INV.inv9, type: "receivable", customerName: "Walk-in Customer", paymentDate: daysAgo(5), amount: 4363, paymentMethod: "cash", createdAt: daysAgo(5) },
  { id: PAY.pay11, invoiceId: INV.inv15, type: "receivable", customerName: "Walk-in Customer", paymentDate: daysAgo(0), amount: 131327, paymentMethod: "upi", referenceNumber: "UPI-WI-TODAY", createdAt: daysAgo(0) },
  { id: PAY.pay12, purchaseId: PUR.p1, type: "payable", supplierName: "Samsung India Electronics Pvt Ltd", paymentDate: daysAgo(44), amount: 2000000, paymentMethod: "bank_transfer", referenceNumber: "RTGS-SAM-001", createdAt: daysAgo(44) },
  { id: PAY.pay13, purchaseId: PUR.p1, type: "payable", supplierName: "Samsung India Electronics Pvt Ltd", paymentDate: daysAgo(30), amount: 1127800, paymentMethod: "bank_transfer", referenceNumber: "RTGS-SAM-002", createdAt: daysAgo(30) },
  { id: PAY.pay14, purchaseId: PUR.p2, type: "payable", supplierName: "Apple India Pvt Ltd", paymentDate: daysAgo(40), amount: 2000000, paymentMethod: "bank_transfer", referenceNumber: "RTGS-APL-001", createdAt: daysAgo(40) },
  { id: PAY.pay15, purchaseId: PUR.p3, type: "payable", supplierName: "Dell Technologies India", paymentDate: daysAgo(35), amount: 1924200, paymentMethod: "bank_transfer", referenceNumber: "RTGS-DEL-001", createdAt: daysAgo(35) },
  { id: PAY.pay16, purchaseId: PUR.p4, type: "payable", supplierName: "Lenovo India Pvt Ltd", paymentDate: daysAgo(33), amount: 1000000, paymentMethod: "bank_transfer", referenceNumber: "NEFT-LEN-001", notes: "Partial payment", createdAt: daysAgo(33) },
  { id: PAY.pay17, purchaseId: PUR.p5, type: "payable", supplierName: "Boat Lifestyle", paymentDate: daysAgo(29), amount: 220140, paymentMethod: "bank_transfer", referenceNumber: "NEFT-BOAT-001", createdAt: daysAgo(29) },
  { id: PAY.pay18, purchaseId: PUR.p6, type: "payable", supplierName: "Logitech India Pvt Ltd", paymentDate: daysAgo(23), amount: 400000, paymentMethod: "bank_transfer", referenceNumber: "NEFT-LOG-001", createdAt: daysAgo(23) },
  { id: PAY.pay19, purchaseId: PUR.p7, type: "payable", supplierName: "Samsung India Electronics Pvt Ltd", paymentDate: daysAgo(18), amount: 1114200, paymentMethod: "bank_transfer", referenceNumber: "RTGS-SAM-003", createdAt: daysAgo(18) },
  { id: PAY.pay20, purchaseId: PUR.p9, type: "payable", supplierName: "Dell Technologies India", paymentDate: daysAgo(6), amount: 572300, paymentMethod: "bank_transfer", referenceNumber: "NEFT-DEL-002", createdAt: daysAgo(6) },
]

export const demoPaymentsExtended = demoPayments.map(p => {
  const inv = p.invoiceId ? demoInvoices.find(i => i.id === p.invoiceId) : undefined
  const pur = p.purchaseId ? demoPurchases.find(pr => pr.id === p.purchaseId) : undefined
  return {
    ...p,
    invoiceNumber: inv?.invoiceNo ?? null,
    purchaseNumber: pur?.purchaseNo ?? null,
  }
})

export const demoBarcodeLogs: Record<string, IBarcodePrintLog> = {
  [I.i1]: { id: "bl1", itemId: I.i1, itemName: "Samsung Galaxy S24 Ultra 256GB", barcodeNo: "8806095678901", stockAtPrint: 18, labelsPrinted: 20, printType: "batch", layoutId: "standard", printedAt: daysAgo(5), createdAt: daysAgo(5) },
  [I.i6]: { id: "bl2", itemId: I.i6, itemName: "boAt Airdopes 600 ANC", barcodeNo: "5678901234567", stockAtPrint: 45, labelsPrinted: 50, printType: "batch", layoutId: "standard", printedAt: daysAgo(3), createdAt: daysAgo(3) },
  [I.i11]: { id: "bl3", itemId: I.i11, itemName: "USB-C to USB-C Cable 1m (Premium)", barcodeNo: "0123456789012", stockAtPrint: 120, labelsPrinted: 100, printType: "batch", layoutId: "compact", printedAt: daysAgo(2), createdAt: daysAgo(2) },
}

export function getDemoDashboardStats() {
  const invoices = demoInvoices.filter(inv => inv.documentType === "invoice")
  const purchases = demoPurchases
  const allItems = demoItems

  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  const paidInvoices = invoices.filter(i => i.status === "paid")
  const pendingInvoices = invoices.filter(i => i.status === "unpaid" || i.status === "draft")
  const overdueInvoices = invoices.filter(i => {
    if (i.status === "paid") return false
    if (!i.dueDate) return false
    return new Date(i.dueDate) < todayDate
  })

  const totalSalesAmount = invoices.reduce((s, i) => s + i.total, 0)
  const totalOutstanding = invoices.reduce((s, i) => s + i.balance, 0)
  const totalPurchaseAmount = purchases.reduce((s, p) => s + p.total, 0)
  const purchasesDue = purchases.reduce((s, p) => s + p.balance, 0)

  const outOfStock = allItems.filter(it => it.stock <= 0)
  const lowStockOnly = allItems.filter(it => {
    const stock = it.stock
    const minStock = it.minStock
    if (stock <= 0) return false
    if (minStock > 0) return stock <= minStock
    return stock < 5
  })

  const allAlertItems = [...outOfStock, ...lowStockOnly]

  const todayInvoices = invoices.filter(i => {
    const invDate = new Date(i.invoiceDate)
    invDate.setHours(0, 0, 0, 0)
    return invDate.getTime() === todayDate.getTime()
  })

  const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  const monthInvoices = invoices.filter(i => {
    const d = new Date(i.invoiceDate)
    return d >= monthStart && d <= new Date()
  })

  const totalStockValue = allItems.reduce((s, it) => {
    if (it.stock <= 0) return s
    const price = it.purchasePrice || it.salePrice || 0
    return s + it.stock * price
  }, 0)

  return {
    totalInvoices: invoices.length,
    paidInvoices: paidInvoices.length,
    pendingInvoices: pendingInvoices.length,
    overdueInvoices: overdueInvoices.length,
    totalSalesAmount,
    totalOutstanding,
    totalPurchases: purchases.length,
    totalPurchaseAmount,
    purchasesDue,
    totalItems: allItems.length,
    lowStockItems: allAlertItems.length,
    outOfStockItems: outOfStock.length,
    totalStockValue,
    totalCustomers: demoCustomers.length,
    totalSuppliers: demoSuppliers.length,
    todaySales: todayInvoices.reduce((s, i) => s + i.total, 0),
    todayInvoiceCount: todayInvoices.length,
    monthSales: monthInvoices.reduce((s, i) => s + i.total, 0),
    monthInvoiceCount: monthInvoices.length,
    recentInvoices: invoices.slice(0, 5).map(i => ({
      id: i.id,
      invoiceNo: i.invoiceNo,
      customerName: i.customerName,
      total: i.total,
      status: i.status,
      date: typeof i.invoiceDate === "string" ? i.invoiceDate : i.invoiceDate.toISOString().split("T")[0],
    })),
    recentPurchases: purchases.slice(0, 5).map(p => ({
      id: p.id,
      purchaseNo: p.purchaseNo,
      supplierName: p.supplierName,
      total: p.total,
      status: p.status,
      date: typeof p.date === "string" ? p.date : p.date.toISOString().split("T")[0],
    })),
    lowStockItemsList: allAlertItems.slice(0, 5).map(it => ({
      id: it.id,
      name: it.name,
      stock: it.stock,
      minStock: it.minStock,
      unit: it.unit || "PCS",
    })),
  }
}
