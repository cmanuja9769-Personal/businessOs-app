import { NextResponse } from "next/server"
import { authorize, orgScope } from "@/lib/authorize"

const stateCodeMap: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
  "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
  "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura",
  "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
  "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra & Nagar Haveli", "27": "Maharashtra", "29": "Karnataka",
  "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
  "34": "Puducherry", "35": "Andaman & Nicobar", "36": "Telangana",
  "37": "Andhra Pradesh", "38": "Ladakh",
}

function deriveStateFromGstin(gstin: string): { placeOfSupply: string; stateCode: string } | null {
  if (!gstin || gstin.length < 2) return null
  const code = gstin.substring(0, 2)
  const stateName = stateCodeMap[code]
  if (!stateName) return null
  return { placeOfSupply: `${code}-${stateName}`, stateCode: code }
}

export async function GET() {
  try {
    const { supabase, organizationId } = await authorize("purchases", "read")

    const { data, error } = await supabase
      .from("purchases")
      .select("*, purchase_items(*)")
      .or(orgScope(organizationId))
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[API/Purchases] Error fetching purchases:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const purchases = data?.map((purchase) => {
      const gst = purchase.supplier_gst || ""
      const cgst = Number(purchase.cgst || 0)
      const sgst = Number(purchase.sgst || 0)
      const igst = Number(purchase.igst || 0)
      const cess = Number(purchase.cess || 0)
      const totalTax = cgst + sgst + igst + cess
      const total = Number(purchase.total)
      const derived = deriveStateFromGstin(gst)

      return {
      id: purchase.id,
      purchaseNo: purchase.purchase_number,
      supplierId: purchase.supplier_id || "",
      supplierName: purchase.supplier_name,
      supplierPhone: purchase.supplier_phone || "",
      supplierAddress: purchase.supplier_address || "",
      supplierGst: gst,
      supplierGstin: gst,
      placeOfSupply: derived?.placeOfSupply || "",
      stateCode: derived?.stateCode || "",
      state: derived?.placeOfSupply || "",
      date: purchase.purchase_date || purchase.created_at,
      dueDate: purchase.due_date || purchase.purchase_date || purchase.created_at,
      items: purchase.purchase_items?.map((item: Record<string, unknown>) => ({
        itemId: item.item_id || "",
        name: item.item_name,
        hsn: item.hsn || "",
        quantity: item.quantity,
        rate: Number(item.rate),
        discount: Number(item.discount || 0),
        discountType: item.discount_type || "percentage",
        taxRate: Number(item.tax_rate),
        amount: Number(item.amount),
      })) || [],
      subtotal: Number(purchase.subtotal),
      discount: Number(purchase.discount || 0),
      discountType: purchase.discount_type || "percentage",
      cgst,
      sgst,
      igst,
      cess,
      totalTax,
      total,
      paidAmount: Number(purchase.paid_amount || 0),
      balance: Number(purchase.balance || total),
      status: purchase.status,
      gstEnabled: purchase.gst_enabled,
      notes: purchase.notes || "",
      createdAt: purchase.created_at,
      updatedAt: purchase.updated_at,
    }}) || []

    return NextResponse.json(purchases)
  } catch (error) {
    console.error("[API/Purchases] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
