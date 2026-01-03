import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatCurrency, formatDate } from './utils';

interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  customer_email?: string;
  customer_gstin?: string;
  items: Array<{
    itemName: string;
    quantity: number;
    unit: string;
    rate: number;
    gstRate: number;
    amount: number;
  }>;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  notes?: string;
  terms?: string;
}

interface OrganizationData {
  name: string;
  address?: string;
  gstin?: string;
  email?: string;
  phone?: string;
}

const generateInvoiceHTML = (invoice: InvoiceData, organization: OrganizationData): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            color: #333;
            padding: 20px;
          }
          
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #ddd;
          }
          
          .header {
            background-color: #2563eb;
            color: white;
            padding: 20px;
          }
          
          .header h1 {
            margin-bottom: 5px;
            font-size: 28px;
          }
          
          .header .invoice-number {
            font-size: 14px;
            opacity: 0.9;
          }
          
          .info-section {
            display: flex;
            padding: 20px;
            border-bottom: 1px solid #ddd;
          }
          
          .from, .to {
            flex: 1;
          }
          
          .section-title {
            font-weight: bold;
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 10px;
          }
          
          .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .info-line {
            font-size: 14px;
            margin-bottom: 4px;
            color: #555;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
          }
          
          thead {
            background-color: #f3f4f6;
          }
          
          th {
            text-align: left;
            padding: 12px;
            font-size: 12px;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            border-bottom: 2px solid #ddd;
          }
          
          td {
            padding: 12px;
            border-bottom: 1px solid #eee;
            font-size: 14px;
          }
          
          .text-right {
            text-align: right;
          }
          
          .totals {
            padding: 20px;
            background-color: #f9fafb;
          }
          
          .totals-table {
            margin-left: auto;
            width: 300px;
          }
          
          .totals-table td {
            padding: 8px 12px;
            border: none;
          }
          
          .totals-table .total-row {
            font-weight: bold;
            font-size: 16px;
            border-top: 2px solid #ddd;
            color: #2563eb;
          }
          
          .notes-section {
            padding: 20px;
            border-top: 1px solid #ddd;
          }
          
          .notes-title {
            font-weight: bold;
            margin-bottom: 8px;
            font-size: 14px;
          }
          
          .notes-text {
            font-size: 13px;
            color: #666;
            line-height: 1.6;
          }
          
          .footer {
            text-align: center;
            padding: 20px;
            background-color: #f3f4f6;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <!-- Header -->
          <div class="header">
            <h1>INVOICE</h1>
            <div class="invoice-number">#${invoice.invoice_number}</div>
          </div>
          
          <!-- From/To Section -->
          <div class="info-section">
            <div class="from">
              <div class="section-title">From</div>
              <div class="company-name">${organization.name}</div>
              ${organization.address ? `<div class="info-line">${organization.address}</div>` : ''}
              ${organization.gstin ? `<div class="info-line">GSTIN: ${organization.gstin}</div>` : ''}
              ${organization.email ? `<div class="info-line">${organization.email}</div>` : ''}
              ${organization.phone ? `<div class="info-line">${organization.phone}</div>` : ''}
            </div>
            
            <div class="to">
              <div class="section-title">Bill To</div>
              <div class="company-name">${invoice.customer_name}</div>
              ${invoice.customer_email ? `<div class="info-line">${invoice.customer_email}</div>` : ''}
              ${invoice.customer_gstin ? `<div class="info-line">GSTIN: ${invoice.customer_gstin}</div>` : ''}
              <div class="info-line" style="margin-top: 10px;">
                <strong>Date:</strong> ${formatDate(invoice.invoice_date)}
              </div>
            </div>
          </div>
          
          <!-- Items Table -->
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Unit</th>
                <th class="text-right">Rate</th>
                <th class="text-right">GST</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.itemName}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">${item.unit}</td>
                  <td class="text-right">${formatCurrency(item.rate)}</td>
                  <td class="text-right">${item.gstRate}%</td>
                  <td class="text-right">${formatCurrency(item.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <!-- Totals -->
          <div class="totals">
            <table class="totals-table">
              <tr>
                <td>Subtotal</td>
                <td class="text-right">${formatCurrency(invoice.subtotal)}</td>
              </tr>
              ${invoice.cgst > 0 ? `
                <tr>
                  <td>CGST</td>
                  <td class="text-right">${formatCurrency(invoice.cgst)}</td>
                </tr>
              ` : ''}
              ${invoice.sgst > 0 ? `
                <tr>
                  <td>SGST</td>
                  <td class="text-right">${formatCurrency(invoice.sgst)}</td>
                </tr>
              ` : ''}
              ${invoice.igst > 0 ? `
                <tr>
                  <td>IGST</td>
                  <td class="text-right">${formatCurrency(invoice.igst)}</td>
                </tr>
              ` : ''}
              <tr class="total-row">
                <td>Total</td>
                <td class="text-right">${formatCurrency(invoice.total)}</td>
              </tr>
            </table>
          </div>
          
          <!-- Notes -->
          ${invoice.notes || invoice.terms ? `
            <div class="notes-section">
              ${invoice.notes ? `
                <div>
                  <div class="notes-title">Notes</div>
                  <div class="notes-text">${invoice.notes}</div>
                </div>
              ` : ''}
              ${invoice.terms ? `
                <div style="margin-top: 15px;">
                  <div class="notes-title">Terms & Conditions</div>
                  <div class="notes-text">${invoice.terms}</div>
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          <!-- Footer -->
          <div class="footer">
            <div>Thank you for your business!</div>
            <div style="margin-top: 5px;">Generated by ${organization.name}</div>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const generateInvoicePDF = async (
  invoice: InvoiceData,
  organization: OrganizationData
): Promise<string> => {
  try {
    const html = generateInvoiceHTML(invoice, organization);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    return uri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const shareInvoicePDF = async (
  invoice: InvoiceData,
  organization: OrganizationData
): Promise<void> => {
  try {
    const pdfUri = await generateInvoicePDF(invoice, organization);
    
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }
    
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Invoice ${invoice.invoice_number}`,
      UTI: 'com.adobe.pdf',
    });
  } catch (error) {
    console.error('Error sharing PDF:', error);
    throw error;
  }
};

export const printInvoice = async (
  invoice: InvoiceData,
  organization: OrganizationData
): Promise<void> => {
  try {
    const html = generateInvoiceHTML(invoice, organization);
    
    await Print.printAsync({
      html,
    });
  } catch (error) {
    console.error('Error printing invoice:', error);
    throw error;
  }
};
