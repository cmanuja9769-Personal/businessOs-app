"use client"

import { format } from "date-fns"
import type { IInvoice } from "@/types"
import type { ISettings } from "@/app/settings/actions"

interface PrintableInvoiceProps {
  invoice: IInvoice
  settings: ISettings
}

export function PrintableInvoice({ invoice, settings }: PrintableInvoiceProps) {
  const primaryColor = settings.templateColor || "#6366f1"
  const showCustomField1 = !!settings.customField1Enabled
  const showCustomField2 = !!settings.customField2Enabled

  const hideOnImageError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    e.currentTarget.style.display = "none"
  }

  return (
    <div className="hidden print:block bg-white">
      <div
        className="print-page"
        style={{
          width: "100%",
          maxWidth: "190mm",
          margin: "0 auto",
          boxSizing: "border-box",
          padding: "6mm",
          fontSize: "11px",
          lineHeight: "1.4",
          fontFamily: "Arial, sans-serif",
          color: "#333",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: `2px solid ${primaryColor}`,
            paddingBottom: "12px",
            marginBottom: "16px",
          }}
        >
          <div style={{ flex: 1 }}>
            {settings.businessLogoUrl && (
              <img
                src={settings.businessLogoUrl}
                alt="Logo"
                style={{ height: "40px", marginBottom: "8px", objectFit: "contain" }}
                onError={hideOnImageError}
              />
            )}
            <h1 style={{ fontSize: "18px", fontWeight: "bold", color: primaryColor, margin: "4px 0" }}>
              {settings.businessName}
            </h1>
            <div style={{ fontSize: "9px", color: "#666", marginTop: "6px" }}>
              {settings.businessAddress && <p style={{ margin: "2px 0" }}>{settings.businessAddress}</p>}
              {settings.businessPhone && <p style={{ margin: "2px 0" }}>Phone: {settings.businessPhone}</p>}
              {settings.businessEmail && <p style={{ margin: "2px 0" }}>Email: {settings.businessEmail}</p>}
              {settings.businessGst && (
                <p style={{ margin: "4px 0", fontWeight: "bold" }}>GSTIN: {settings.businessGst}</p>
              )}
            </div>
          </div>

          <div style={{ textAlign: "right", minWidth: "180px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", color: primaryColor, margin: "0 0 8px 0" }}>INVOICE</h2>
            <div style={{ fontSize: "10px" }}>
              <p style={{ fontWeight: "bold", margin: "2px 0" }}>{invoice.invoiceNo}</p>
              <p style={{ color: "#666", margin: "2px 0" }}>Date: {format(invoice.invoiceDate, "dd MMM yyyy")}</p>
              <p style={{ color: "#666", margin: "2px 0" }}>Due: {format(invoice.dueDate, "dd MMM yyyy")}</p>
              <div
                style={{
                  display: "inline-block",
                  backgroundColor: invoice.status === "paid" ? primaryColor : "#e5e7eb",
                  color: invoice.status === "paid" ? "white" : "#333",
                  padding: "2px 6px",
                  borderRadius: "3px",
                  marginTop: "4px",
                  fontSize: "9px",
                  fontWeight: "bold",
                }}
              >
                {invoice.status.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ fontSize: "10px", fontWeight: "bold", color: primaryColor, margin: "0 0 4px 0" }}>BILL TO:</h3>
          <div style={{ fontSize: "10px" }}>
            <p style={{ fontWeight: "bold", margin: "2px 0" }}>{invoice.customerName}</p>
            {invoice.customerAddress && <p style={{ color: "#666", margin: "2px 0" }}>{invoice.customerAddress}</p>}
            {invoice.customerPhone && <p style={{ color: "#666", margin: "2px 0" }}>Phone: {invoice.customerPhone}</p>}
            {invoice.customerGst && <p style={{ fontWeight: "bold", margin: "4px 0" }}>GSTIN: {invoice.customerGst}</p>}
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${primaryColor}`, backgroundColor: `${primaryColor}15` }}>
              <th
                style={{
                  textAlign: "left",
                  padding: "6px 4px",
                  fontWeight: "bold",
                  color: primaryColor,
                  fontSize: "9px",
                }}
              >
                #
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "6px 4px",
                  fontWeight: "bold",
                  color: primaryColor,
                  fontSize: "9px",
                }}
              >
                Description
              </th>
              <th
                style={{
                  textAlign: "center",
                  padding: "6px 4px",
                  fontWeight: "bold",
                  color: primaryColor,
                  fontSize: "9px",
                }}
              >
                Qty
              </th>
              {showCustomField1 && (
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 4px",
                    fontWeight: "bold",
                    color: primaryColor,
                    fontSize: "9px",
                  }}
                >
                  {settings.customField1Label || "Custom Field 1"}
                </th>
              )}
              {showCustomField2 && (
                <th
                  style={{
                    textAlign: "right",
                    padding: "6px 4px",
                    fontWeight: "bold",
                    color: primaryColor,
                    fontSize: "9px",
                  }}
                >
                  {settings.customField2Label || "Custom Field 2"}
                </th>
              )}
              <th
                style={{
                  textAlign: "right",
                  padding: "6px 4px",
                  fontWeight: "bold",
                  color: primaryColor,
                  fontSize: "9px",
                }}
              >
                Rate
              </th>
              {invoice.gstEnabled && (
                <th
                  style={{
                    textAlign: "center",
                    padding: "6px 4px",
                    fontWeight: "bold",
                    color: primaryColor,
                    fontSize: "9px",
                  }}
                >
                  GST%
                </th>
              )}
              <th
                style={{
                  textAlign: "right",
                  padding: "6px 4px",
                  fontWeight: "bold",
                  color: primaryColor,
                  fontSize: "9px",
                }}
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "4px", color: "#666", fontSize: "9px" }}>{index + 1}</td>
                <td style={{ padding: "4px", fontSize: "9px", fontWeight: "500" }}>
                  {item.itemName}
                  <div style={{ fontSize: "8px", color: "#666" }}>{item.unit}</div>
                </td>
                <td style={{ padding: "4px", textAlign: "center", fontSize: "9px" }}>{item.quantity}</td>
                {showCustomField1 && (
                  <td style={{ padding: "4px", textAlign: "left", fontSize: "9px", color: "#666" }}>
                    {item.customField1Value || ""}
                  </td>
                )}
                {showCustomField2 && (
                  <td style={{ padding: "4px", textAlign: "right", fontSize: "9px", color: "#666" }}>
                    {item.customField2Value == null ? "" : item.customField2Value}
                  </td>
                )}
                <td style={{ padding: "4px", textAlign: "right", fontSize: "9px" }}>
                  {settings.currencySymbol}
                  {item.rate.toFixed(2)}
                </td>
                {invoice.gstEnabled && (
                  <td style={{ padding: "4px", textAlign: "center", fontSize: "9px" }}>{item.gstRate}%</td>
                )}
                <td style={{ padding: "4px", textAlign: "right", fontSize: "9px", fontWeight: "500" }}>
                  {settings.currencySymbol}
                  {item.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
          <div style={{ width: "240px" }}>
            <div style={{ fontSize: "9px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0" }}>
                <span style={{ color: "#666" }}>Subtotal:</span>
                <span>
                  {settings.currencySymbol}
                  {invoice.subtotal.toFixed(2)}
                </span>
              </div>
              {invoice.gstEnabled && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0" }}>
                    <span style={{ color: "#666" }}>CGST:</span>
                    <span>
                      {settings.currencySymbol}
                      {invoice.cgst.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0" }}>
                    <span style={{ color: "#666" }}>SGST:</span>
                    <span>
                      {settings.currencySymbol}
                      {invoice.sgst.toFixed(2)}
                    </span>
                  </div>
                  {invoice.igst > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0" }}>
                      <span style={{ color: "#666" }}>IGST:</span>
                      <span>
                        {settings.currencySymbol}
                        {invoice.igst.toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              )}
              {invoice.discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0", color: "#16a34a" }}>
                  <span>Discount:</span>
                  <span>
                    -{settings.currencySymbol}
                    {invoice.discount.toFixed(2)}
                  </span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: `2px solid ${primaryColor}`,
                  paddingTop: "4px",
                  marginTop: "6px",
                  fontSize: "11px",
                  fontWeight: "bold",
                  color: primaryColor,
                }}
              >
                <span>Total:</span>
                <span>
                  {settings.currencySymbol}
                  {invoice.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        {settings.bankName && (
          <div
            style={{
              padding: "8px",
              border: `1px solid ${primaryColor}`,
              borderRadius: "3px",
              marginBottom: "12px",
              backgroundColor: `${primaryColor}08`,
            }}
          >
            <h3 style={{ fontSize: "9px", fontWeight: "bold", color: primaryColor, margin: "0 0 4px 0" }}>
              Payment Information:
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "9px" }}>
              <div>
                <p style={{ margin: "2px 0" }}>
                  <span style={{ fontWeight: "bold" }}>Bank:</span> {settings.bankName}
                </p>
                <p style={{ margin: "2px 0" }}>
                  <span style={{ fontWeight: "bold" }}>Account No:</span> {settings.bankAccountNo}
                </p>
              </div>
              <div>
                <p style={{ margin: "2px 0" }}>
                  <span style={{ fontWeight: "bold" }}>IFSC Code:</span> {settings.bankIfsc}
                </p>
                {settings.upiId && (
                  <p style={{ margin: "2px 0" }}>
                    <span style={{ fontWeight: "bold" }}>UPI ID:</span> {settings.upiId}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div style={{ marginBottom: "12px", fontSize: "9px" }}>
            <h3 style={{ fontWeight: "bold", color: primaryColor, margin: "0 0 4px 0" }}>Notes:</h3>
            <p style={{ margin: 0, color: "#666", whiteSpace: "pre-wrap" }}>{invoice.notes}</p>
          </div>
        )}

        {/* E-Invoice Info */}
        {invoice.irn && (
          <div
            style={{
              padding: "8px",
              border: `1px solid ${primaryColor}`,
              borderRadius: "3px",
              marginBottom: "12px",
              backgroundColor: `${primaryColor}08`,
            }}
          >
            <p style={{ fontSize: "9px", fontWeight: "bold", color: primaryColor, margin: "0 0 4px 0" }}>
              E-Invoice Generated
            </p>
            <div style={{ fontSize: "8px", color: "#666" }}>
              <p style={{ margin: "2px 0" }}>IRN: {invoice.irn}</p>
              {invoice.eInvoiceDate && (
                <p style={{ margin: "2px 0" }}>Date: {format(new Date(invoice.eInvoiceDate), "dd MMM yyyy HH:mm")}</p>
              )}
            </div>
            {invoice.qrCode && (
              <img
                src={invoice.qrCode}
                alt="QR"
                style={{ width: "60px", height: "60px", marginTop: "4px" }}
                onError={hideOnImageError}
              />
            )}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: `1px solid #ddd`,
            paddingTop: "8px",
            marginTop: "16px",
            fontSize: "9px",
            color: "#666",
          }}
        >
          <div>{settings.invoiceFooter || "Thank you for your business!"}</div>
          {settings.signatureImageUrl && (
            <div style={{ textAlign: "center" }}>
              <img
                src={settings.signatureImageUrl}
                alt="Signature"
                style={{ height: "30px", marginBottom: "2px" }}
                onError={hideOnImageError}
              />
              <div style={{ borderTop: "1px solid #333", paddingTop: "2px", fontSize: "8px" }}>
                Authorized Signatory
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
