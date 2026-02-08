import type { IInvoice } from "@/types"
import type { ISettings } from "@/app/settings/actions"

/**
 * Email Templates for Invoices
 * Supports multiple pre-designed templates with variable interpolation
 */

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  htmlContent: string
  previewText: string
  variables: string[] // e.g., {{customerName}}, {{invoiceNumber}}, {{dueDate}}
  description: string
}

/**
 * Replace template variables with actual values
 */
export function interpolateTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
    return data[variable] || match
  })
}

/**
 * Get all available email templates
 */
export const getEmailTemplates = (): Record<string, EmailTemplate> => ({
  standard: {
    id: "standard",
    name: "Standard Invoice",
    subject: "Invoice {{invoiceNumber}} - {{organizationName}}",
    previewText: "Your invoice {{invoiceNumber}} is ready",
    description: "Professional invoice email with basic details",
    variables: [
      "customerName",
      "invoiceNumber",
      "invoiceDate",
      "dueDate",
      "totalAmount",
      "organizationName",
      "organizationEmail",
    ],
    htmlContent: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
            .company-name { font-size: 20px; font-weight: bold; color: #6366f1; }
            .content { margin-bottom: 30px; }
            .invoice-details { background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .invoice-details p { margin: 8px 0; }
            .amount { font-size: 32px; font-weight: bold; color: #6366f1; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="company-name">{{organizationName}}</div>
              <p>Invoice</p>
            </div>
            
            <div class="content">
              <p>Dear {{customerName}},</p>
              <p>Thank you for your business! Your invoice is now ready.</p>
              
              <div class="invoice-details">
                <p><strong>Invoice Number:</strong> {{invoiceNumber}}</p>
                <p><strong>Invoice Date:</strong> {{invoiceDate}}</p>
                <p><strong>Due Date:</strong> {{dueDate}}</p>
              </div>
              
              <div class="amount">₹{{totalAmount}}</div>
              
              <p>Please find the detailed invoice attached to this email or click the button below to view it online.</p>
              
              <a href="{{invoiceLink}}" class="button">View Invoice</a>
            </div>
            
            <div class="footer">
              <p>If you have any questions, please feel free to contact us at {{organizationEmail}}</p>
              <p>Thank you!</p>
            </div>
          </div>
        </body>
      </html>
    `,
  },

  professional: {
    id: "professional",
    name: "Professional Invoice",
    subject: "Invoice {{invoiceNumber}} - Payment Due {{dueDate}}",
    previewText: "Professional invoice from {{organizationName}}",
    description: "Detailed invoice email with full transaction breakdown",
    variables: [
      "customerName",
      "invoiceNumber",
      "invoiceDate",
      "dueDate",
      "subtotal",
      "taxAmount",
      "totalAmount",
      "organizationName",
      "organizationEmail",
      "bankDetails",
    ],
    htmlContent: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; background: #f9f9f9; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .logo { margin-bottom: 30px; }
            .invoice-header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #6366f1; padding-bottom: 20px; }
            .invoice-title { font-size: 32px; font-weight: bold; color: #6366f1; }
            .invoice-meta { text-align: right; font-size: 13px; color: #666; }
            .customer-info { margin-bottom: 30px; }
            .customer-info strong { color: #6366f1; }
            table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            thead tr { background: #f0f0f0; }
            th { padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #6366f1; }
            td { padding: 10px 12px; border-bottom: 1px solid #e0e0e0; }
            .amount-right { text-align: right; }
            .totals-table { width: 100%; margin-top: 30px; }
            .totals-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; }
            .total-amount { font-size: 24px; font-weight: bold; color: #6366f1; padding: 15px 0; border-top: 2px solid #6366f1; border-bottom: 2px solid #6366f1; margin: 20px 0; }
            .bank-section { background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 30px 0; font-size: 13px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="invoice-header">
              <div>
                <div class="invoice-title">INVOICE</div>
              </div>
              <div class="invoice-meta">
                <p><strong>{{organizationName}}</strong></p>
                <p>{{invoiceDate}}</p>
              </div>
            </div>
            
            <div class="customer-info">
              <p>Dear <strong>{{customerName}}</strong>,</p>
              <p>Please find below your invoice details:</p>
              <p><strong>Invoice #:</strong> {{invoiceNumber}}</p>
              <p><strong>Due Date:</strong> {{dueDate}}</p>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="amount-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Subtotal</td>
                  <td class="amount-right">₹{{subtotal}}</td>
                </tr>
                <tr>
                  <td>Tax (GST)</td>
                  <td class="amount-right">₹{{taxAmount}}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="total-amount">
              Total: ₹{{totalAmount}}
            </div>
            
            {{#if bankDetails}}
            <div class="bank-section">
              <strong>Payment Details:</strong>
              {{bankDetails}}
            </div>
            {{/if}}
            
            <div class="footer">
              <p>Thank you for your business!</p>
              <p>For inquiries, contact {{organizationEmail}}</p>
            </div>
          </div>
        </body>
      </html>
    `,
  },

  minimal: {
    id: "minimal",
    name: "Minimal Invoice",
    subject: "Invoice {{invoiceNumber}}",
    previewText: "{{invoiceNumber}} - {{totalAmount}}",
    description: "Clean and simple invoice email",
    variables: ["customerName", "invoiceNumber", "totalAmount", "dueDate"],
    htmlContent: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: system-ui, sans-serif; color: #333; line-height: 1.5; }
            .container { max-width: 500px; margin: 0 auto; padding: 30px 20px; }
            h2 { color: #333; margin-bottom: 20px; }
            .details { margin: 30px 0; }
            .details p { margin: 10px 0; }
            .amount { font-size: 28px; font-weight: bold; margin: 30px 0; }
            .cta { margin: 30px 0; }
            a { color: #6366f1; text-decoration: none; font-weight: bold; }
            .footer { margin-top: 50px; font-size: 12px; color: #999; border-top: 1px solid #e0e0e0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Invoice {{invoiceNumber}}</h2>
            
            <p>Hi {{customerName}},</p>
            
            <div class="details">
              <p><strong>Amount Due:</strong> ₹{{totalAmount}}</p>
              <p><strong>Due Date:</strong> {{dueDate}}</p>
            </div>
            
            <div class="cta">
              <p><a href="{{invoiceLink}}">View Invoice</a></p>
            </div>
            
            <div class="footer">
              <p>Thank you!</p>
            </div>
          </div>
        </body>
      </html>
    `,
  },

  followup: {
    id: "followup",
    name: "Payment Reminder",
    subject: "Reminder: Invoice {{invoiceNumber}} Due {{dueDate}}",
    previewText: "Payment reminder for {{invoiceNumber}}",
    description: "Polite payment reminder email",
    variables: ["customerName", "invoiceNumber", "dueDate", "totalAmount", "organizationName"],
    htmlContent: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert { background: #fffbea; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .details { background: #f3f4f6; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <p>Dear {{customerName}},</p>
            
            <div class="alert">
              <p><strong>Payment Reminder</strong></p>
              <p>This is a friendly reminder that payment for invoice {{invoiceNumber}} is now due.</p>
            </div>
            
            <div class="details">
              <p><strong>Invoice Number:</strong> {{invoiceNumber}}</p>
              <p><strong>Amount:</strong> ₹{{totalAmount}}</p>
              <p><strong>Due Date:</strong> {{dueDate}}</p>
            </div>
            
            <p>Please make payment at your earliest convenience. If you have already processed this payment, please disregard this notice.</p>
            
            <a href="{{invoiceLink}}" class="button">View Invoice</a>
            
            <p style="margin-top: 30px; color: #666; font-size: 13px;">Thank you for your prompt attention to this matter.</p>
          </div>
        </body>
      </html>
    `,
  },

  overdue: {
    id: "overdue",
    name: "Overdue Payment Notice",
    subject: "URGENT: Invoice {{invoiceNumber}} is Now Overdue",
    previewText: "Overdue payment notice for {{invoiceNumber}}",
    description: "Payment overdue notice email",
    variables: ["customerName", "invoiceNumber", "dueDate", "totalAmount", "daysOverdue"],
    htmlContent: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
            .alert strong { color: #dc2626; }
            .details { background: #f3f4f6; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; padding: 10px 20px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <p>Dear {{customerName}},</p>
            
            <div class="alert">
              <p><strong>URGENT: Payment Overdue</strong></p>
              <p>Your payment for invoice {{invoiceNumber}} is now {{daysOverdue}} days overdue.</p>
            </div>
            
            <div class="details">
              <p><strong>Invoice Number:</strong> {{invoiceNumber}}</p>
              <p><strong>Amount Due:</strong> ₹{{totalAmount}}</p>
              <p><strong>Original Due Date:</strong> {{dueDate}}</p>
            </div>
            
            <p>Immediate payment is required. Please make payment as soon as possible to avoid further action.</p>
            
            <a href="{{invoiceLink}}" class="button">Pay Now</a>
            
            <p style="margin-top: 30px; color: #666; font-size: 13px;">If payment has already been made, please disregard this notice and accept our apologies.</p>
          </div>
        </body>
      </html>
    `,
  },
})

/**
 * Get a specific email template
 */
export function getEmailTemplate(templateId: string): EmailTemplate | undefined {
  const templates = getEmailTemplates()
  return templates[templateId]
}

/**
 * Generate email content with actual data
 */
export function generateEmailContent(
  templateId: string,
  invoice: IInvoice,
  settings: ISettings,
  invoiceLink?: string,
): { subject: string; html: string; previewText: string } | null {
  const template = getEmailTemplate(templateId)
  if (!template) return null

  const upiSuffix = settings.upiId ? `, UPI: ${settings.upiId}` : ""
  const variables: Record<string, string> = {
    customerName: invoice.customerName,
    invoiceNumber: invoice.invoiceNo,
    invoiceDate: new Date(invoice.invoiceDate).toLocaleDateString("en-IN"),
    dueDate: new Date(invoice.dueDate).toLocaleDateString("en-IN"),
    totalAmount: invoice.total.toFixed(2),
    subtotal: invoice.subtotal.toFixed(2),
    taxAmount: (invoice.cgst + invoice.sgst + invoice.igst).toFixed(2),
    organizationName: settings.businessName || "Invoice",
    organizationEmail: settings.businessEmail || "support@businessos.local",
    invoiceLink: invoiceLink || `https://businessos.local/invoices/${invoice.id}`,
    bankDetails: settings.bankName
      ? `Bank: ${settings.bankName}, Account: ${settings.bankAccountNo}${upiSuffix}`
      : "",
    daysOverdue: Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)).toString(),
  }

  return {
    subject: interpolateTemplate(template.subject, variables),
    html: interpolateTemplate(template.htmlContent, variables),
    previewText: interpolateTemplate(template.previewText, variables),
  }
}
