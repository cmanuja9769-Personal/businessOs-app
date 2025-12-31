import { createClient } from "@supabase/supabase-js"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const irpApiKey = Deno.env.get("IRP_API_KEY")!
const irpApiUrl = Deno.env.get("IRP_API_URL") || "https://api.einvoice.irp.provider/v1"

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface EInvoiceRequest {
  invoiceId: string
  organizationId: string
}

interface IRPResponse {
  success: boolean
  data?: {
    irn: string
    qrCode: string
    signedInvoice: string
  }
  error?: string
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const { invoiceId, organizationId } = (await req.json()) as EInvoiceRequest

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, invoice_items(*)")
      .eq("id", invoiceId)
      .eq("organization_id", organizationId)
      .single()

    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Fetch organization details for GSTIN
    const { data: org } = await supabase
      .from("app_organizations")
      .select("gst_number, pan_number, name, address")
      .eq("id", organizationId)
      .single()

    if (!org?.gst_number) {
      return new Response(JSON.stringify({ error: "Organization GST number not configured" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Prepare invoice data for IRP
    const irpPayload = prepareIRPPayload(invoice, org)

    // Call IRP API (example with placeholder)
    // In production, use actual IRP provider API
    const irpResponse = await generateIRN(irpPayload)

    if (!irpResponse.success) {
      console.error("[v0] IRP generation failed:", irpResponse.error)
      return new Response(JSON.stringify({ error: "Failed to generate E-Invoice", details: irpResponse.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Update invoice with IRN and QR code
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        irn: irpResponse.data?.irn,
        qr_code: irpResponse.data?.qrCode,
        e_invoice_date: new Date().toISOString(),
      })
      .eq("id", invoiceId)

    if (updateError) {
      console.error("[v0] Error updating invoice:", updateError)
      return new Response(JSON.stringify({ error: "Failed to update invoice" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Log activity
    const authHeader = req.headers.get("Authorization")
    const userId = authHeader?.split("Bearer ")[1]

    if (userId) {
      await supabase.from("activity_logs").insert({
        user_id: userId,
        action: "einvoice_generated",
        resource_type: "invoice",
        resource_id: invoiceId,
        details: { irn: irpResponse.data?.irn },
        organization_id: organizationId,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        irn: irpResponse.data?.irn,
        qrCode: irpResponse.data?.qrCode,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("[v0] Generate E-Invoice error:", error)
    return new Response(JSON.stringify({ error: "Internal server error", details: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})

function prepareIRPPayload(invoice: any, org: any) {
  return {
    documentType: "INV",
    version: "1.1",
    transactionDetails: {
      taxScheme: "GST",
      supplyType: invoice.customer_gst ? "B2B" : "B2C",
      documentNumber: invoice.invoice_number,
      documentDate: invoice.invoice_date,
      documentValue: Number(invoice.total),
    },
    sellerDetails: {
      gstin: org.gst_number,
      legalName: org.name,
      address1: org.address,
      pincode: "000000", // To be added to organization table
      phone: "", // To be added
      email: "", // To be added
    },
    buyerDetails: {
      gstin: invoice.customer_gst || "",
      name: invoice.customer_name,
      address1: invoice.customer_address || "",
      pincode: "000000",
      phone: invoice.customer_phone || "",
    },
    itemList: invoice.invoice_items.map((item: any) => ({
      itemNumber: item.item_id,
      productName: item.item_name,
      productDescription: item.item_name,
      hsnCode: item.hsn_code || "999899",
      quantity: item.quantity,
      unit: item.unit || "PCS",
      unitPrice: Number(item.rate),
      netAmount: Number(item.amount),
      taxRate: item.gst_rate || 0,
      taxAmount: (Number(item.amount) * (item.gst_rate || 0)) / 100,
      itemValue: Number(item.amount) + (Number(item.amount) * (item.gst_rate || 0)) / 100,
    })),
    summary: {
      totalQuantity: invoice.invoice_items.reduce((sum: number, item: any) => sum + item.quantity, 0),
      totalValue: Number(invoice.subtotal),
      sgstValue: Number(invoice.sgst || 0),
      cgstValue: Number(invoice.cgst || 0),
      igstValue: Number(invoice.igst || 0),
      cessValue: Number(invoice.cess || 0),
      totalInvoiceValue: Number(invoice.total),
    },
  }
}

async function generateIRN(payload: any): Promise<IRPResponse> {
  // Placeholder: In production, call actual IRP provider API
  // Examples: ClearTax, Masters India, NIC Direct, etc.

  // For now, generate a mock IRN
  const irn = generateMockIRN()
  const qrCode = generateQRCodeData(irn, payload)

  return {
    success: true,
    data: {
      irn,
      qrCode,
      signedInvoice: JSON.stringify(payload),
    },
  }
}

function generateMockIRN(): string {
  // Format: 32 character alphanumeric
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 12).toUpperCase()
  return (timestamp + random).substring(0, 32)
}

function generateQRCodeData(irn: string, payload: any): string {
  // QR code contains IRN, document number, date, amount, buyer GSTIN
  return `${irn}|${payload.transactionDetails.documentNumber}|${payload.transactionDetails.documentDate}|${payload.summary.totalInvoiceValue}|${payload.buyerDetails.gstin || ""}`
}
