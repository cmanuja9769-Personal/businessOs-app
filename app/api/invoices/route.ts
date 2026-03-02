import { NextResponse } from "next/server"
import { authorize, orgScope } from "@/lib/authorize"

export async function GET() {
  try {
    const { supabase, organizationId } = await authorize("invoices", "read")

    const { data, error } = await supabase
      .from("invoices")
      .select("*, invoice_items(*)")
      .or(orgScope(organizationId))
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[API/Invoices] Error fetching invoices:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const stateCodeMap: Record<string, string> = {
      "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
      "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
      "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
      "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
      "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh",
      "24": "Gujarat", "25": "Daman & Diu", "26": "Dadra & Nagar Haveli", "27": "Maharashtra",
      "28": "Andhra Pradesh", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep",
      "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar",
      "36": "Telangana", "37": "Andhra Pradesh (New)", "38": "Ladakh",
    }

    function deriveStateFromGstin(gstin: string | null | undefined): { stateCode: string; stateName: string } | null {
      if (!gstin || gstin.length < 2) return null
      const code = gstin.substring(0, 2)
      const name = stateCodeMap[code]
      if (!name) return null
      return { stateCode: code, stateName: name }
    }

    const invoices = data?.map((invoice) => {
      const gst = invoice.customer_gst || ""
      const stateInfo = deriveStateFromGstin(gst)
      const cgst = Number(invoice.cgst || 0)
      const sgst = Number(invoice.sgst || 0)
      const igst = Number(invoice.igst || 0)
      const cess = Number(invoice.cess || 0)
      const totalTax = cgst + sgst + igst + cess
      const total = Number(invoice.total)
      const subtotal = Number(invoice.subtotal)

      return {
      id: invoice.id,
      invoiceNo: invoice.invoice_number,
      documentType: invoice.document_type || "invoice",
      customerId: invoice.customer_id || "",
      customerName: invoice.customer_name,
      customerPhone: invoice.customer_phone || "",
      customerAddress: invoice.customer_address || "",
      customerGst: gst,
      customerGstin: gst,
      placeOfSupply: stateInfo?.stateName || "",
      stateCode: stateInfo?.stateCode || "",
      invoiceDate: invoice.invoice_date || invoice.created_at,
      dueDate: invoice.due_date || invoice.invoice_date || invoice.created_at,
      items: invoice.invoice_items?.map((item: Record<string, unknown>) => ({
        itemId: item.item_id || "",
        itemName: item.item_name,
        name: item.item_name,
        quantity: item.quantity,
        unit: item.unit || "PCS",
        rate: Number(item.rate),
        price: Number(item.rate),
        gstRate: Number(item.tax_rate || item.gst_rate || 0),
        hsnCode: String(item.hsn || ""),
        cessRate: Number(item.cess_rate || 0),
        discount: Number(item.discount || 0),
        amount: Number(item.amount),
        purchasePrice: Number(item.purchase_price || 0),
        cgstAmount: igst > 0 ? 0 : (Number(item.amount) * Number(item.tax_rate || item.gst_rate || 0)) / 200,
        sgstAmount: igst > 0 ? 0 : (Number(item.amount) * Number(item.tax_rate || item.gst_rate || 0)) / 200,
        igstAmount: igst > 0 ? (Number(item.amount) * Number(item.tax_rate || item.gst_rate || 0)) / 100 : 0,
      })) || [],
      subtotal,
      taxableAmount: subtotal,
      cgst,
      sgst,
      igst,
      cess,
      totalTax,
      discount: Number(invoice.discount || 0),
      discountType: invoice.discount_type || "percentage",
      total,
      paidAmount: Number(invoice.paid_amount || 0),
      balance: Number(invoice.balance || total),
      status: invoice.status,
      gstEnabled: invoice.gst_enabled,
      notes: invoice.notes || "",
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at,
    }}) || []

    return NextResponse.json(invoices)
  } catch (error) {
    console.error("[API/Invoices] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
