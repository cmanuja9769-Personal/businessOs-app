/* eslint-disable @next/next/no-img-element */
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { IInvoice, DocumentType } from "@/types";
import { DOCUMENT_TYPE_CONFIG } from "@/types";
import type { ISettings } from "@/app/settings/actions";

interface ModernTemplateProps {
  invoice: IInvoice;
  settings: ISettings;
}

function _withAlpha(hex: string, alphaHex: string) {
  const value = (hex || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return `${value}${alphaHex}`;
  if (/^#[0-9a-fA-F]{8}$/.test(value)) return `${value.slice(0, 7)}${alphaHex}`;
  return value;
}

function documentLabel(documentType: DocumentType) {
  return DOCUMENT_TYPE_CONFIG[documentType]?.label || "Invoice";
}

export function ModernTemplate({ invoice, settings }: ModernTemplateProps) {
  const primaryColor = settings.templateColor || "#6366f1";

  return (
    <div
      className="bg-white w-full"
      style={{ "--invoice-primary": primaryColor } as React.CSSProperties}
    >
      <div className="mx-auto w-full max-w-210 min-h-297 p-8 print:p-6 print:min-h-0">
        {/* Top Header Band */}
        <div className="flex items-center justify-between gap-4 px-6 py-6 bg-(--invoice-primary)">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {settings.businessLogoUrl ? (
              <img
                src={settings.businessLogoUrl}
                alt="Company Logo"
                className="h-12 w-12 shrink-0 rounded bg-white object-contain p-1"
              />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded bg-white/15" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-white text-xl font-semibold truncate">
                {settings.businessName}
              </div>
              {(settings.businessGst || settings.businessPhone) && (
                <div className="text-white/80 text-xs mt-0.5 truncate">
                  {(() => {
                    if (settings.businessGst) return `GSTIN: ${settings.businessGst}`
                    if (settings.businessPhone) return `Phone: ${settings.businessPhone}`
                    return ""
                  })()}
                </div>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-white text-3xl font-bold tracking-tight">
              {documentLabel(invoice.documentType).toUpperCase()}
            </div>
            <div className="mt-2">
              <span className="inline-flex items-center rounded bg-white/15 px-3 py-1 text-xs font-medium text-white">
                {invoice.invoiceNo}
              </span>
            </div>
          </div>
        </div>

        {/* Meta + Bill To */}
        <div className="grid grid-cols-2 gap-8 px-6 py-6 bg-(--invoice-primary)/5">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Invoice Date</div>
                <div className="text-sm font-semibold text-gray-900">
                  {format(invoice.invoiceDate, "dd MMM yyyy")}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Due Date</div>
                <div className="text-sm font-semibold text-gray-900">
                  {format(invoice.dueDate, "dd MMM yyyy")}
                </div>
              </div>
              {invoice.validityDate && (
                <div className="col-span-2">
                  <div className="text-xs text-gray-500">Validity</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {format(invoice.validityDate, "dd MMM yyyy")}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Badge
                variant={invoice.status === "paid" ? "default" : "secondary"}
                className={
                  invoice.status === "paid"
                    ? "bg-(--invoice-primary) hover:bg-(--invoice-primary)/90"
                    : ""
                }
              >
                {invoice.status.toUpperCase()}
              </Badge>
              {invoice.irn && (
                <span className="text-xs font-medium text-(--invoice-primary)">
                  E-INVOICED
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-(--invoice-primary)">
              BILL TO
            </div>
            <div className="text-base font-semibold text-gray-900">
              {invoice.customerName}
            </div>
            {invoice.customerAddress && (
              <div className="text-sm text-gray-600 whitespace-pre-wrap">
                {invoice.customerAddress}
              </div>
            )}
            <div className="text-sm text-gray-600 space-y-0.5">
              {invoice.customerPhone && (
                <div>Phone: {invoice.customerPhone}</div>
              )}
              {invoice.customerGst && (
                <div className="font-medium text-gray-900">
                  GSTIN: {invoice.customerGst}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="px-6 pt-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-(--invoice-primary)">
                <th className="py-3 px-3 text-left text-xs font-semibold text-white">
                  DESCRIPTION
                </th>
                <th className="py-3 px-3 text-center text-xs font-semibold text-white">
                  QTY
                </th>
                <th className="py-3 px-3 text-right text-xs font-semibold text-white">
                  RATE
                </th>
                {invoice.gstEnabled && (
                  <th className="py-3 px-3 text-center text-xs font-semibold text-white">
                    TAX
                  </th>
                )}
                <th className="py-3 px-3 text-right text-xs font-semibold text-white">
                  AMOUNT
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-3 px-3">
                    <div className="text-sm font-medium text-gray-900">
                      {item.itemName}
                    </div>
                    {item.unit && (
                      <div className="text-xs text-gray-500">{item.unit}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center text-sm text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="py-3 px-3 text-right text-sm text-gray-900">
                    {settings.currencySymbol}
                    {item.rate.toFixed(2)}
                  </td>
                  {invoice.gstEnabled && (
                    <td className="py-3 px-3 text-center text-sm text-gray-900">
                      {item.gstRate}%
                    </td>
                  )}
                  <td className="py-3 px-3 text-right text-sm font-semibold text-gray-900">
                    {settings.currencySymbol}
                    {item.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-6 pt-6">
          <div className="flex justify-end">
            <div className="w-96">
              <div className="rounded p-4 bg-(--invoice-primary)/8">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">
                      {settings.currencySymbol}
                      {invoice.subtotal.toFixed(2)}
                    </span>
                  </div>
                  {invoice.gstEnabled && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">CGST</span>
                        <span className="text-gray-900">
                          {settings.currencySymbol}
                          {invoice.cgst.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">SGST</span>
                        <span className="text-gray-900">
                          {settings.currencySymbol}
                          {invoice.sgst.toFixed(2)}
                        </span>
                      </div>
                      {invoice.igst > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">IGST</span>
                          <span className="text-gray-900">
                            {settings.currencySymbol}
                            {invoice.igst.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {invoice.cess > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cess</span>
                          <span className="text-gray-900">
                            {settings.currencySymbol}
                            {invoice.cess.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {invoice.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount</span>
                      <span className="text-gray-900">
                        -{settings.currencySymbol}
                        {invoice.discount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="pt-3 mt-3 border-t border-(--invoice-primary)">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-semibold text-(--invoice-primary)">
                        TOTAL
                      </span>
                      <span className="text-2xl font-bold text-(--invoice-primary)">
                        {settings.currencySymbol}
                        {invoice.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {(invoice.paidAmount > 0 || invoice.balance > 0) && (
                <div className="mt-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Paid</span>
                    <span>
                      {settings.currencySymbol}
                      {invoice.paidAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-medium text-gray-900">
                    <span>Balance</span>
                    <span>
                      {settings.currencySymbol}
                      {invoice.balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes / Payment / Terms */}
        <div className="px-6 pt-6 space-y-4">
          {(invoice.notes || settings.customTerms) && (
            <div className="grid grid-cols-2 gap-6">
              {invoice.notes && (
                <div>
                  <div className="text-xs font-semibold text-(--invoice-primary)">
                    NOTES
                  </div>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap mt-1">
                    {invoice.notes}
                  </div>
                </div>
              )}
              {settings.customTerms && (
                <div>
                  <div className="text-xs font-semibold text-(--invoice-primary)">
                    TERMS
                  </div>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap mt-1">
                    {settings.customTerms}
                  </div>
                </div>
              )}
            </div>
          )}

          {settings.bankName && (
            <div className="rounded p-4 bg-(--invoice-primary)/5">
              <div className="text-xs font-semibold text-(--invoice-primary)">
                PAYMENT INFORMATION
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 mt-2">
                <div className="space-y-1">
                  <div>
                    <span className="font-medium">Bank:</span>{" "}
                    {settings.bankName}
                  </div>
                  {settings.bankAccountNo && (
                    <div>
                      <span className="font-medium">Account No:</span>{" "}
                      {settings.bankAccountNo}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {settings.bankIfsc && (
                    <div>
                      <span className="font-medium">IFSC:</span>{" "}
                      {settings.bankIfsc}
                    </div>
                  )}
                  {settings.upiId && (
                    <div>
                      <span className="font-medium">UPI:</span> {settings.upiId}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pt-10">
          <div className="flex items-end justify-between border-t pt-6">
            <div className="text-sm text-gray-600">
              {settings.invoiceFooter || "Thank you for your business!"}
            </div>
            {settings.signatureImageUrl && (
              <div className="text-center">
                <img
                  src={settings.signatureImageUrl}
                  alt="Signature"
                  className="h-14 w-auto mb-1"
                />
                <div className="border-t border-gray-800 pt-1">
                  <div className="text-xs font-medium text-gray-900">
                    Authorized Signatory
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
