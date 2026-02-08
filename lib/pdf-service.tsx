import type { IInvoice } from "@/types"
import type { ISettings } from "@/app/settings/actions"

/**
 * PDF Generation Service
 * Converts invoice HTML to PDF using server-side rendering
 */

export interface PDFOptions {
  format: "A4" | "letter"
  margin: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

const _defaultOptions: PDFOptions = {
  format: "A4",
  margin: { top: 20, right: 20, bottom: 20, left: 20 },
}

/**
 * Generate invoice HTML for PDF conversion
 * Used with html2pdf or similar tools
 */
export function generateInvoiceHTML(invoice: IInvoice, settings: ISettings, _templateName = "classic"): string {
  const primaryColor = settings.templateColor || "#6366f1"
  const igstHtml = invoice.igst > 0
    ? `<div class="totals-row"><span>IGST:</span><span>₹${invoice.igst.toFixed(2)}</span></div>`
    : ""
  const upiHtml = settings.upiId ? `<div><strong>UPI ID:</strong> ${settings.upiId}</div>` : ""

  // Base HTML structure with all invoice data
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; line-height: 1.6; }
          .page { width: 210mm; height: 297mm; margin: 0; padding: 20mm; background: white; }
          
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${primaryColor}; padding-bottom: 20px; margin-bottom: 30px; }
          .company-info h1 { color: ${primaryColor}; font-size: 28px; margin-bottom: 10px; }
          .company-logo { max-width: 120px; max-height: 80px; margin-bottom: 10px; }
          .company-details { font-size: 12px; color: #666; line-height: 1.6; }
          
          .invoice-title { font-size: 36px; font-weight: bold; color: ${primaryColor}; margin-bottom: 15px; }
          .invoice-meta { font-size: 12px; }
          .invoice-meta p { margin: 5px 0; }
          .status-badge { display: inline-block; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-top: 10px; background: #f0f0f0; }
          
          .bill-to { margin-bottom: 30px; }
          .bill-to h3 { color: ${primaryColor}; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
          .bill-to p { font-size: 13px; margin: 5px 0; }
          
          table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          thead tr { background: ${primaryColor}; color: white; }
          th { padding: 12px; text-align: left; font-size: 12px; font-weight: bold; }
          td { padding: 10px 12px; font-size: 12px; border-bottom: 1px solid #e0e0e0; }
          tbody tr:hover { background: #f9f9f9; }
          
          .amount-col { text-align: right; }
          .qty-col { text-align: center; }
          
          .totals { float: right; width: 300px; margin-top: 30px; }
          .totals-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px; }
          .totals-row.total { border-top: 2px solid ${primaryColor}; padding-top: 10px; font-size: 16px; font-weight: bold; color: ${primaryColor}; }
          
          .bank-details { clear: both; margin-top: 40px; padding: 15px; background: #f5f5f5; border-radius: 4px; font-size: 11px; }
          .bank-details h3 { color: ${primaryColor}; font-weight: bold; margin-bottom: 10px; }
          
          .terms { margin-top: 20px; font-size: 11px; color: #666; }
          .terms h3 { color: ${primaryColor}; font-weight: bold; margin-bottom: 8px; }
          
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }
          
          @media print {
            body { margin: 0; padding: 0; }
            .page { margin: 0; box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Header -->
          <div class="header">
            <div class="company-info">
              ${settings.businessLogoUrl ? `<img src="${settings.businessLogoUrl}" alt="Logo" class="company-logo">` : ""}
              <h1>${settings.businessName || "Invoice"}</h1>
              <div class="company-details">
                ${settings.businessAddress ? `<div>${settings.businessAddress}</div>` : ""}
                ${settings.businessPhone ? `<div>Phone: ${settings.businessPhone}</div>` : ""}
                ${settings.businessEmail ? `<div>Email: ${settings.businessEmail}</div>` : ""}
                ${settings.businessGst ? `<div style="font-weight: bold; margin-top: 8px;">GSTIN: ${settings.businessGst}</div>` : ""}
                ${settings.businessPan ? `<div>PAN: ${settings.businessPan}</div>` : ""}
              </div>
            </div>
            <div style="text-align: right;">
              <div class="invoice-title">INVOICE</div>
              <div class="invoice-meta">
                <p><strong>${invoice.invoiceNo}</strong></p>
                <p>Date: ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</p>
                <p>Due: ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}</p>
                <div class="status-badge">${invoice.status.toUpperCase()}</div>
              </div>
            </div>
          </div>
          
          <!-- Bill To -->
          <div class="bill-to">
            <h3>BILL TO:</h3>
            <p><strong>${invoice.customerName}</strong></p>
            ${invoice.customerAddress ? `<p>${invoice.customerAddress}</p>` : ""}
            ${invoice.customerPhone ? `<p>Phone: ${invoice.customerPhone}</p>` : ""}
            ${invoice.customerGst ? `<p style="font-weight: bold; margin-top: 8px;">GSTIN: ${invoice.customerGst}</p>` : ""}
          </div>
          
          <!-- Items Table -->
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th class="qty-col">Qty</th>
                <th class="amount-col">Rate</th>
                ${invoice.gstEnabled ? '<th class="amount-col">GST%</th>' : ""}
                <th class="amount-col">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items
                .map(
                  (item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>
                    <div><strong>${item.itemName}</strong></div>
                    <div style="color: #999; font-size: 10px;">${item.unit}</div>
                  </td>
                  <td class="qty-col">${item.quantity}</td>
                  <td class="amount-col">₹${item.rate.toFixed(2)}</td>
                  ${invoice.gstEnabled ? `<td class="amount-col">${item.gstRate}%</td>` : ""}
                  <td class="amount-col"><strong>₹${item.amount.toFixed(2)}</strong></td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          
          <!-- Totals -->
          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>₹${invoice.subtotal.toFixed(2)}</span>
            </div>
            ${
              invoice.gstEnabled
                ? `
              <div class="totals-row">
                <span>CGST (${((invoice.cgst / (invoice.subtotal * 0.5)) * 100).toFixed(1)}%):</span>
                <span>₹${invoice.cgst.toFixed(2)}</span>
              </div>
              <div class="totals-row">
                <span>SGST (${((invoice.sgst / (invoice.subtotal * 0.5)) * 100).toFixed(1)}%):</span>
                <span>₹${invoice.sgst.toFixed(2)}</span>
              </div>
              ${igstHtml}
            `
                : ""
            }
            ${
              invoice.discount > 0
                ? `
              <div class="totals-row">
                <span>Discount:</span>
                <span>-₹${invoice.discount.toFixed(2)}</span>
              </div>
            `
                : ""
            }
            <div class="totals-row total">
              <span>TOTAL:</span>
              <span>₹${invoice.total.toFixed(2)}</span>
            </div>
          </div>
          
          <!-- Bank Details -->
          ${
            settings.bankName
              ? `
            <div class="bank-details">
              <h3>Payment Details:</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                  <div><strong>Bank:</strong> ${settings.bankName}</div>
                  <div><strong>Account:</strong> ${settings.bankAccountNo || "N/A"}</div>
                </div>
                <div>
                  <div><strong>IFSC Code:</strong> ${settings.bankIfsc || "N/A"}</div>
                  ${upiHtml}
                </div>
              </div>
            </div>
          `
              : ""
          }
          
          <!-- Terms -->
          ${
            invoice.notes
              ? `
            <div class="terms">
              <h3>Notes & Terms:</h3>
              <p>${invoice.notes.replace(/\n/g, "<br>")}</p>
            </div>
          `
              : ""
          }
          
          <!-- Footer -->
          <div class="footer">
            <p>${settings.invoiceFooter || "Thank you for your business!"}</p>
            <p style="margin-top: 10px;">Generated on ${new Date().toLocaleString("en-IN")}</p>
          </div>
        </div>
      </body>
    </html>
  `
}

/**
 * Alternative: Generate PDF using html2pdf library (client-side)
 * Can be called from browser components
 */
export async function downloadInvoicePDF(
  invoice: IInvoice,
  settings: ISettings,
  filename = `invoice-${invoice.invoiceNo}.pdf`,
) {
  // This would be called from client component
  // Uses html2pdf or similar library
  const html = generateInvoiceHTML(invoice, settings)

  // In a real implementation, this would use a library like:
  // - html2pdf.js (browser-based)
  // - puppeteer (server-side)
  // - pdfkit (Node.js)

  return { html, filename }
}
