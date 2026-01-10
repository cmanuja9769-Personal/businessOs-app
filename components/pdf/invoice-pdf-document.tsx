"use client"

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer"
import { format } from "date-fns"
import type { IInvoice } from "@/types"
import type { ISettings } from "@/app/settings/actions"

// Register a font that supports Hindi (Noto Sans supports Devanagari)
Font.register({
  family: "NotoSans",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans/files/noto-sans-all-400-normal.woff",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans/files/noto-sans-all-700-normal.woff",
      fontWeight: 700,
    },
  ],
})

interface InvoicePDFDocumentProps {
  invoice: IInvoice
  settings: ISettings
}

// Helper to convert hex to RGB values for opacity
const hexToRgba = (hex: string, alpha: number) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`
    : `rgba(99, 102, 241, ${alpha})`
}

export function InvoicePDFDocument({ invoice, settings }: InvoicePDFDocumentProps) {
  const primaryColor = settings.templateColor || "#6366f1"
  const currencySymbol = settings.currencySymbol || "₹"
  const showCustomField1 = !!settings.customField1Enabled
  const showCustomField2 = !!settings.customField2Enabled

  // Create styles with dynamic primary color
  const styles = StyleSheet.create({
    page: {
      padding: 24,
      fontSize: 11,
      fontFamily: "NotoSans",
      backgroundColor: "#ffffff",
      lineHeight: 1.4,
    },
    // Header
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderBottomWidth: 2,
      borderBottomColor: primaryColor,
      paddingBottom: 12,
      marginBottom: 16,
    },
    companySection: {
      flex: 1,
    },
    logo: {
      height: 40,
      width: 100,
      marginBottom: 8,
      objectFit: "contain",
    },
    businessName: {
      fontSize: 18,
      fontWeight: "bold",
      color: primaryColor,
      marginBottom: 4,
    },
    businessDetailsContainer: {
      marginTop: 2,
    },
    businessDetailRow: {
      fontSize: 9,
      color: "#666666",
      marginBottom: 2,
    },
    businessGst: {
      fontSize: 9,
      fontWeight: "bold",
      color: "#000000",
      marginTop: 4,
    },
    invoiceSection: {
      alignItems: "flex-end",
      minWidth: 180,
    },
    invoiceTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: primaryColor,
      marginBottom: 8,
    },
    invoiceNumber: {
      fontSize: 11,
      fontWeight: "bold",
      marginBottom: 3,
    },
    invoiceDate: {
      fontSize: 10,
      color: "#666666",
      marginBottom: 2,
    },
    statusBadge: {
      fontSize: 9,
      fontWeight: "bold",
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 3,
      marginTop: 4,
    },
    // Bill To Section
    billToSection: {
      marginBottom: 16,
      paddingLeft: 12,
      paddingTop: 2,
      paddingBottom: 2,
      borderLeftWidth: 3,
      borderLeftColor: primaryColor,
    },
    sectionTitle: {
      fontSize: 10,
      fontWeight: "bold",
      color: primaryColor,
      marginBottom: 4,
      textTransform: "uppercase",
    },
    customerName: {
      fontSize: 10,
      fontWeight: "bold",
      marginBottom: 2,
      color: "#000000",
    },
    customerDetails: {
      fontSize: 10,
      color: "#666666",
      marginBottom: 2,
    },
    customerGst: {
      fontSize: 10,
      fontWeight: "bold",
      marginTop: 4,
      color: "#000000",
    },
    // Table
    table: {
      marginBottom: 16,
    },
    tableHeader: {
      flexDirection: "row",
      borderBottomWidth: 2,
      borderBottomColor: primaryColor,
      backgroundColor: hexToRgba(primaryColor, 0.1),
      paddingVertical: 8,
      paddingHorizontal: 6,
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#e5e7eb",
      paddingVertical: 6,
      paddingHorizontal: 6,
    },
    tableRowAlt: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#e5e7eb",
      paddingVertical: 6,
      paddingHorizontal: 6,
      backgroundColor: "#fafafa",
    },
    tableHeaderText: {
      fontSize: 9,
      fontWeight: "bold",
      color: primaryColor,
      textTransform: "uppercase",
    },
    tableCellText: {
      fontSize: 9,
      color: "#333333",
    },
    tableCellTextMuted: {
      fontSize: 8,
      color: "#666666",
    },
    tableCellBold: {
      fontSize: 9,
      fontWeight: "bold",
      color: "#222222",
    },
    // Totals
    totalsContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginBottom: 18,
    },
    totalsBox: {
      width: 250,
      padding: 12,
      backgroundColor: "#fafafa",
      borderRadius: 4,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    totalLabel: {
      fontSize: 10,
      color: "#666666",
    },
    totalValue: {
      fontSize: 10,
      textAlign: "right",
    },
    discountValue: {
      fontSize: 10,
      color: "#16a34a",
    },
    grandTotalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 2,
      borderTopColor: primaryColor,
      paddingTop: 6,
      marginTop: 8,
    },
    grandTotalLabel: {
      fontSize: 13,
      fontWeight: "bold",
      color: primaryColor,
    },
    grandTotalValue: {
      fontSize: 13,
      fontWeight: "bold",
      color: primaryColor,
    },
    // Bank Details
    bankSection: {
      padding: 12,
      borderWidth: 1,
      borderColor: primaryColor,
      borderRadius: 4,
      marginBottom: 14,
      backgroundColor: hexToRgba(primaryColor, 0.03),
    },
    bankTitle: {
      fontSize: 10,
      fontWeight: "bold",
      color: primaryColor,
      marginBottom: 8,
      textTransform: "uppercase",
    },
    bankGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    bankCol: {
      width: "48%",
    },
    bankRow: {
      fontSize: 9,
      marginBottom: 3,
      color: "#444444",
    },
    bankLabel: {
      fontWeight: "bold",
      color: "#333333",
    },
    // Notes
    notesSection: {
      marginBottom: 14,
      padding: 10,
      backgroundColor: "#f9fafb",
      borderRadius: 4,
      borderLeftWidth: 3,
      borderLeftColor: primaryColor,
    },
    notesTitle: {
      fontSize: 9,
      fontWeight: "bold",
      color: primaryColor,
      marginBottom: 4,
    },
    notesText: {
      fontSize: 9,
      color: "#555555",
    },
    // E-Invoice
    eInvoiceSection: {
      flexDirection: "row",
      padding: 12,
      borderWidth: 1,
      borderColor: primaryColor,
      borderRadius: 4,
      marginBottom: 14,
      backgroundColor: hexToRgba(primaryColor, 0.03),
    },
    eInvoiceInfo: {
      flex: 1,
    },
    eInvoiceTitle: {
      fontSize: 10,
      fontWeight: "bold",
      color: primaryColor,
      marginBottom: 6,
    },
    eInvoiceDetail: {
      fontSize: 8,
      color: "#555555",
      marginBottom: 2,
    },
    qrCodeContainer: {
      marginLeft: 12,
      alignItems: "center",
    },
    qrCode: {
      width: 70,
      height: 70,
    },
    // Footer
    footer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      borderTopWidth: 1,
      borderTopColor: "#dddddd",
      paddingTop: 12,
      marginTop: 20,
    },
    footerLeft: {
      flex: 1,
    },
    footerText: {
      fontSize: 9,
      color: "#666666",
      marginBottom: 2,
    },
    signatureContainer: {
      alignItems: "center",
      minWidth: 120,
    },
    signatureImage: {
      height: 40,
      width: 100,
      marginBottom: 4,
      objectFit: "contain",
    },
    signatureLine: {
      borderTopWidth: 1,
      borderTopColor: "#333333",
      paddingTop: 4,
      fontSize: 8,
      color: "#333333",
    },
    customTerms: {
      marginTop: 12,
      fontSize: 8,
      color: "#888888",
      textAlign: "center",
    },
  })

  // Calculate dynamic column widths
  const getColumnWidths = () => {
    let descWidth = 35
    if (!showCustomField1) descWidth += 6
    if (!showCustomField2) descWidth += 6
    if (!invoice.gstEnabled) descWidth += 4
    
    return {
      num: 5,
      desc: descWidth,
      qty: 8,
      custom1: showCustomField1 ? 10 : 0,
      custom2: showCustomField2 ? 10 : 0,
      rate: 14,
      gst: invoice.gstEnabled ? 8 : 0,
      amount: 15,
    }
  }

  const colWidths = getColumnWidths()

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companySection}>
            {settings.businessLogoUrl && (
              <Image style={styles.logo} src={settings.businessLogoUrl} />
            )}
            <Text style={styles.businessName}>{settings.businessName || "Business Name"}</Text>
            <View style={styles.businessDetailsContainer}>
              {settings.businessAddress && (
                <Text style={styles.businessDetailRow}>{settings.businessAddress}</Text>
              )}
              {settings.businessPhone && (
                <Text style={styles.businessDetailRow}>Phone: {settings.businessPhone}</Text>
              )}
              {settings.businessEmail && (
                <Text style={styles.businessDetailRow}>Email: {settings.businessEmail}</Text>
              )}
              {settings.businessGst && (
                <Text style={styles.businessGst}>GSTIN: {settings.businessGst}</Text>
              )}
            </View>
          </View>

          <View style={styles.invoiceSection}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNo}</Text>
            <Text style={styles.invoiceDate}>
              Date: {format(new Date(invoice.invoiceDate), "dd MMM yyyy")}
            </Text>
            <Text style={styles.invoiceDate}>
              Due: {format(new Date(invoice.dueDate), "dd MMM yyyy")}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: 
                    invoice.status === "paid" ? "#22c55e" :
                    invoice.status === "partial" ? "#f59e0b" :
                    invoice.status === "overdue" ? "#ef4444" : "#e5e7eb",
                  color: 
                    invoice.status === "draft" ? "#333333" : "#ffffff",
                },
              ]}
            >
              <Text>{invoice.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.billToSection}>
          <Text style={styles.sectionTitle}>Bill To:</Text>
          <Text style={styles.customerName}>{invoice.customerName}</Text>
          {invoice.customerAddress && (
            <Text style={styles.customerDetails}>{invoice.customerAddress}</Text>
          )}
          {invoice.customerPhone && (
            <Text style={styles.customerDetails}>Phone: {invoice.customerPhone}</Text>
          )}
          {invoice.customerGst && (
            <Text style={styles.customerGst}>GSTIN: {invoice.customerGst}</Text>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: `${colWidths.num}%`, textAlign: "center" }]}>#</Text>
            <Text style={[styles.tableHeaderText, { width: `${colWidths.desc}%` }]}>Description</Text>
            <Text style={[styles.tableHeaderText, { width: `${colWidths.qty}%`, textAlign: "center" }]}>Qty</Text>
            {showCustomField1 && (
              <Text style={[styles.tableHeaderText, { width: `${colWidths.custom1}%`, textAlign: "center" }]}>
                {settings.customField1Label || "Field 1"}
              </Text>
            )}
            {showCustomField2 && (
              <Text style={[styles.tableHeaderText, { width: `${colWidths.custom2}%`, textAlign: "right" }]}>
                {settings.customField2Label || "Field 2"}
              </Text>
            )}
            <Text style={[styles.tableHeaderText, { width: `${colWidths.rate}%`, textAlign: "right" }]}>Rate</Text>
            {invoice.gstEnabled && (
              <Text style={[styles.tableHeaderText, { width: `${colWidths.gst}%`, textAlign: "center" }]}>GST%</Text>
            )}
            <Text style={[styles.tableHeaderText, { width: `${colWidths.amount}%`, textAlign: "right" }]}>Amount</Text>
          </View>

          {/* Table Rows */}
          {invoice.items.map((item, index) => {
            // Calculate packaging display if applicable
            let displayQty = `${item.quantity}`
            if (item.displayAsPackaging && item.packagingUnit && item.perCartonQuantity && item.perCartonQuantity > 1) {
              // Show as packaging units if quantity is exact multiple
              const packagingQty = Math.floor(item.quantity / item.perCartonQuantity)
              const remainderQty = item.quantity % item.perCartonQuantity
              if (remainderQty === 0 && packagingQty > 0) {
                displayQty = `${packagingQty} ${item.packagingUnit}`
              } else if (packagingQty > 0 && remainderQty > 0) {
                displayQty = `${packagingQty} ${item.packagingUnit} + ${remainderQty} ${item.unit}`
              }
            }
            
            return (
            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt} wrap={false}>
              <Text style={[styles.tableCellTextMuted, { width: `${colWidths.num}%`, textAlign: "center" }]}>
                {index + 1}
              </Text>
              <View style={{ width: `${colWidths.desc}%` }}>
                <Text style={styles.tableCellBold}>{item.itemName}</Text>
                {item.unit && <Text style={styles.tableCellTextMuted}>{item.unit}</Text>}
              </View>
              <Text style={[styles.tableCellText, { width: `${colWidths.qty}%`, textAlign: "center" }]}>
                {displayQty}
              </Text>
              {showCustomField1 && (
                <Text style={[styles.tableCellTextMuted, { width: `${colWidths.custom1}%`, textAlign: "center" }]}>
                  {item.customField1Value || "-"}
                </Text>
              )}
              {showCustomField2 && (
                <Text style={[styles.tableCellTextMuted, { width: `${colWidths.custom2}%`, textAlign: "right" }]}>
                  {item.customField2Value != null ? item.customField2Value : "-"}
                </Text>
              )}
              <Text style={[styles.tableCellText, { width: `${colWidths.rate}%`, textAlign: "right" }]}>
                {currencySymbol}{item.rate.toFixed(2)}
              </Text>
              {invoice.gstEnabled && (
                <Text style={[styles.tableCellText, { width: `${colWidths.gst}%`, textAlign: "center" }]}>
                  {item.gstRate}%
                </Text>
              )}
              <Text style={[styles.tableCellBold, { width: `${colWidths.amount}%`, textAlign: "right" }]}>
                {currencySymbol}{item.amount.toFixed(2)}
              </Text>
            </View>
            )
          })}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>{currencySymbol}{invoice.subtotal.toFixed(2)}</Text>
            </View>

            {invoice.gstEnabled && (
              <>
                {invoice.cgst > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>CGST:</Text>
                    <Text style={styles.totalValue}>{currencySymbol}{invoice.cgst.toFixed(2)}</Text>
                  </View>
                )}
                {invoice.sgst > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>SGST:</Text>
                    <Text style={styles.totalValue}>{currencySymbol}{invoice.sgst.toFixed(2)}</Text>
                  </View>
                )}
                {invoice.igst > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>IGST:</Text>
                    <Text style={styles.totalValue}>{currencySymbol}{invoice.igst.toFixed(2)}</Text>
                  </View>
                )}
              </>
            )}

            {invoice.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.discountValue}>Discount:</Text>
                <Text style={styles.discountValue}>-{currencySymbol}{invoice.discount.toFixed(2)}</Text>
              </View>
            )}

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>TOTAL:</Text>
              <Text style={styles.grandTotalValue}>{currencySymbol}{invoice.total.toFixed(2)}</Text>
            </View>

            {invoice.paidAmount > 0 && (
              <View style={[styles.totalRow, { marginTop: 6 }]}>
                <Text style={{ fontSize: 10, color: "#22c55e" }}>Paid:</Text>
                <Text style={{ fontSize: 10, color: "#22c55e", textAlign: "right" }}>
                  {currencySymbol}{invoice.paidAmount.toFixed(2)}
                </Text>
              </View>
            )}

            {invoice.balance > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ fontSize: 10, color: "#ef4444", fontWeight: "bold" }}>Balance Due:</Text>
                <Text style={{ fontSize: 10, color: "#ef4444", fontWeight: "bold", textAlign: "right" }}>
                  {currencySymbol}{invoice.balance.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Bank Details */}
        {(settings.bankName || settings.bankAccountNo || settings.upiId) && (
          <View style={styles.bankSection} wrap={false}>
            <Text style={styles.bankTitle}>Payment Information</Text>
            <View style={styles.bankGrid}>
              <View style={styles.bankCol}>
                {settings.bankName && (
                  <Text style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Bank: </Text>{settings.bankName}
                  </Text>
                )}
                {settings.bankAccountNo && (
                  <Text style={styles.bankRow}>
                    <Text style={styles.bankLabel}>A/C No: </Text>{settings.bankAccountNo}
                  </Text>
                )}
              </View>
              <View style={styles.bankCol}>
                {settings.bankIfsc && (
                  <Text style={styles.bankRow}>
                    <Text style={styles.bankLabel}>IFSC: </Text>{settings.bankIfsc}
                  </Text>
                )}
                {settings.upiId && (
                  <Text style={styles.bankRow}>
                    <Text style={styles.bankLabel}>UPI ID: </Text>{settings.upiId}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notesSection} wrap={false}>
            <Text style={styles.notesTitle}>Notes:</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* E-Invoice Info */}
        {invoice.irn && (
          <View style={styles.eInvoiceSection} wrap={false}>
            <View style={styles.eInvoiceInfo}>
              <Text style={styles.eInvoiceTitle}>E-Invoice Generated</Text>
              <Text style={styles.eInvoiceDetail}>IRN: {invoice.irn}</Text>
              {invoice.eInvoiceDate && (
                <Text style={styles.eInvoiceDetail}>
                  Date: {format(new Date(invoice.eInvoiceDate), "dd MMM yyyy HH:mm")}
                </Text>
              )}
            </View>
            {invoice.qrCode && (
              <View style={styles.qrCodeContainer}>
                <Image style={styles.qrCode} src={invoice.qrCode} />
              </View>
            )}
          </View>
        )}

        {/* E-Way Bill Info */}
        {invoice.ewaybillNo && (
          <View style={styles.eInvoiceSection} wrap={false}>
            <View style={styles.eInvoiceInfo}>
              <Text style={styles.eInvoiceTitle}>E-Way Bill</Text>
              <Text style={styles.eInvoiceDetail}>E-Way Bill No: {invoice.ewaybillNo}</Text>
              {invoice.ewaybillDate && (
                <Text style={styles.eInvoiceDetail}>Generated: {invoice.ewaybillDate}</Text>
              )}
              {invoice.ewaybillValidUpto && (
                <Text style={styles.eInvoiceDetail}>Valid Until: {invoice.ewaybillValidUpto}</Text>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} wrap={false}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerText}>
              {settings.invoiceFooter || "Thank you for your business!"}
            </Text>
          </View>
          {settings.signatureImageUrl && (
            <View style={styles.signatureContainer}>
              <Image style={styles.signatureImage} src={settings.signatureImageUrl} />
              <Text style={styles.signatureLine}>Authorized Signatory</Text>
            </View>
          )}
        </View>

        {/* Custom Terms */}
        {settings.customTerms && (
          <Text style={styles.customTerms}>{settings.customTerms}</Text>
        )}
      </Page>
    </Document>
  )
}
