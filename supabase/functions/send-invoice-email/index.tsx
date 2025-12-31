import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { Deno } from "deno"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const resendApiKey = Deno.env.get("RESEND_API_KEY")!

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const resend = new Resend(resendApiKey)

interface InvoiceEmailRequest {
  invoiceId: string
  recipientEmail: string
  organizationId: string
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const { invoiceId, recipientEmail, organizationId } = (await req.json()) as InvoiceEmailRequest

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("organization_id", organizationId)
      .single()

    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Fetch organization details
    const { data: org } = await supabase
      .from("app_organizations")
      .select("name, email, phone, gst_number")
      .eq("id", organizationId)
      .single()

    // Send email via Resend
    const emailResult = await resend.emails.send({
      from: `BusinessOS <noreply@businessos.local>`,
      to: recipientEmail,
      subject: `Invoice ${invoice.invoice_number} from ${org?.name || "BusinessOS"}`,
      html: generateInvoiceEmail(invoice, org),
    })

    if (emailResult.error) {
      console.error("[v0] Resend error:", emailResult.error)
      return new Response(JSON.stringify({ error: "Failed to send email", details: emailResult.error }), {
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
        action: "email_sent",
        resource_type: "invoice",
        resource_id: invoiceId,
        details: { email: recipientEmail, messageId: emailResult.data?.id },
        organization_id: organizationId,
      })
    }

    return new Response(JSON.stringify({ success: true, messageId: emailResult.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("[v0] Send invoice email error:", error)
    return new Response(JSON.stringify({ error: "Internal server error", details: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})

function generateInvoiceEmail(invoice: any, org: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 20px; }
          .invoice-number { font-size: 24px; font-weight: bold; color: #007bff; }
          .details { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .amount { font-size: 32px; font-weight: bold; color: #28a745; margin: 20px 0; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 20px; font-weight: bold;">${org?.name || "Invoice"}</div>
            <div class="invoice-number">Invoice ${invoice.invoice_number}</div>
          </div>
          
          <div class="details">
            <p><strong>Customer:</strong> ${invoice.customer_name}</p>
            <p><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
            <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
          </div>

          <div class="amount">
            Total: ₹${Number(invoice.total).toFixed(2)}
          </div>

          <div class="footer">
            <p>This is an automated email. Please do not reply to this email.</p>
            <p>For support, contact ${org?.email || "support@businessos.local"}</p>
          </div>
        </div>
      </body>
    </html>
  `
}
