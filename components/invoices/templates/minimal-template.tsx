/* eslint-disable @next/next/no-img-element */
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { IInvoice, DocumentType } from "@/types";
import { DOCUMENT_TYPE_CONFIG } from "@/types";
import type { ISettings } from "@/app/settings/actions";

interface MinimalTemplateProps {
  invoice: IInvoice;
  settings: ISettings;
}

function documentLabel(documentType: DocumentType) {
  return DOCUMENT_TYPE_CONFIG[documentType]?.label || "Invoice";
}

export function MinimalTemplate({ invoice, settings }: MinimalTemplateProps) {
  const primaryColor = settings.templateColor || "#6366f1";

  return (
    <div
      className="bg-white w-full"
      style={{ "--invoice-primary": primaryColor } as React.CSSProperties}
    >
      <div className="mx-auto w-full max-w-210 min-h-297 p-10 print:p-6 print:min-h-0">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            {settings.businessLogoUrl && (
              <img
                src={settings.businessLogoUrl}
                alt="Company Logo"
                className="h-12 w-auto object-contain"
              />
            )}
            <div className="text-2xl font-semibold text-gray-900">
              {settings.businessName}
            </div>
            <div className="text-sm text-gray-600 space-y-0.5 max-w-md">
              {settings.businessAddress && (
                <div className="whitespace-pre-wrap">
                  {settings.businessAddress}
                </div>
              )}
              {settings.businessPhone && (
                <div>Phone: {settings.businessPhone}</div>
              )}
              {settings.businessEmail && (
                <div>Email: {settings.businessEmail}</div>
              )}
              {settings.businessGst && (
                <div className="text-gray-900 font-medium">
                  GSTIN: {settings.businessGst}
                </div>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-medium tracking-wide text-gray-500">
              {documentLabel(invoice.documentType).toUpperCase()}
            </div>
            <div className="text-3xl font-bold text-gray-900 mt-1">
              {invoice.invoiceNo}
            </div>
            <div className="mt-3 text-sm text-gray-600 space-y-1">
              <div>
                <span className="text-gray-500">Date:</span>{" "}
                {format(invoice.invoiceDate, "dd MMM yyyy")}
              </div>
              <div>
                <span className="text-gray-500">Due:</span>{" "}
                {format(invoice.dueDate, "dd MMM yyyy")}
              </div>
              {invoice.validityDate && (
                <div>
                  <span className="text-gray-500">Validity:</span>{" "}
                  {format(invoice.validityDate, "dd MMM yyyy")}
                </div>
              )}
            </div>
            <div className="mt-3 flex justify-end">
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
            </div>
          </div>
        </div>

        <div className="mt-8 border-t" />

        {/* Bill To */}
        <div className="mt-6 grid grid-cols-2 gap-8">
          <div>
            <div className="text-xs font-semibold text-gray-500">BILL TO</div>
            <div className="text-base font-semibold text-gray-900 mt-2">
              {invoice.customerName}
            </div>
            {invoice.customerAddress && (
              <div className="text-sm text-gray-600 whitespace-pre-wrap mt-1">
                {invoice.customerAddress}
              </div>
            )}
            <div className="text-sm text-gray-600 space-y-0.5 mt-2">
              {invoice.customerPhone && (
                <div>Phone: {invoice.customerPhone}</div>
              )}
              {invoice.customerGst && (
                <div className="text-gray-900 font-medium">
                  GSTIN: {invoice.customerGst}
                </div>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {invoice.irn && (
              <div>
                <div className="text-xs font-semibold text-gray-500">
                  E-INVOICE IRN
                </div>
                <div className="mt-1 font-mono text-xs break-all text-gray-900">
                  {invoice.irn}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="mt-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-3 px-2 text-left text-xs font-semibold text-gray-600">
                  DESCRIPTION
                </th>
                <th className="py-3 px-2 text-center text-xs font-semibold text-gray-600">
                  QTY
                </th>
                <th className="py-3 px-2 text-right text-xs font-semibold text-gray-600">
                  RATE
                </th>
                {invoice.gstEnabled && (
                  <th className="py-3 px-2 text-center text-xs font-semibold text-gray-600">
                    GST%
                  </th>
                )}
                <th className="py-3 px-2 text-right text-xs font-semibold text-gray-600">
                  AMOUNT
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="border-b last:border-b-0">
                  <td className="py-3 px-2">
                    <div className="text-sm font-medium text-gray-900">
                      {item.itemName}
                    </div>
                    {item.unit && (
                      <div className="text-xs text-gray-500">{item.unit}</div>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center text-sm text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="py-3 px-2 text-right text-sm text-gray-900">
                    {settings.currencySymbol}
                    {item.rate.toFixed(2)}
                  </td>
                  {invoice.gstEnabled && (
                    <td className="py-3 px-2 text-center text-sm text-gray-900">
                      {item.gstRate}%
                    </td>
                  )}
                  <td className="py-3 px-2 text-right text-sm font-semibold text-gray-900">
                    {settings.currencySymbol}
                    {item.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-8 flex justify-end">
          <div className="w-80">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900 font-medium">
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
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-semibold text-gray-900">
                    TOTAL
                  </span>
                  <span className="text-2xl font-bold text-(--invoice-primary)">
                    {settings.currencySymbol}
                    {invoice.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {(invoice.paidAmount > 0 || invoice.balance > 0) && (
              <div className="mt-4 text-sm">
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

        {/* Notes / Payment / Terms */}
        <div className="mt-10 grid grid-cols-2 gap-8">
          <div className="space-y-4">
            {invoice.notes && (
              <div>
                <div className="text-xs font-semibold text-gray-500">NOTES</div>
                <div className="text-sm text-gray-600 whitespace-pre-wrap mt-2">
                  {invoice.notes}
                </div>
              </div>
            )}

            {settings.bankName && (
              <div>
                <div className="text-xs font-semibold text-gray-500">
                  PAYMENT
                </div>
                <div className="text-sm text-gray-600 mt-2 space-y-1">
                  <div>
                    <span className="font-medium text-gray-900">Bank:</span>{" "}
                    {settings.bankName}
                  </div>
                  {settings.bankAccountNo && (
                    <div>
                      <span className="font-medium text-gray-900">
                        Account No:
                      </span>{" "}
                      {settings.bankAccountNo}
                    </div>
                  )}
                  {settings.bankIfsc && (
                    <div>
                      <span className="font-medium text-gray-900">IFSC:</span>{" "}
                      {settings.bankIfsc}
                    </div>
                  )}
                  {settings.upiId && (
                    <div>
                      <span className="font-medium text-gray-900">UPI:</span>{" "}
                      {settings.upiId}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {settings.customTerms && (
              <div>
                <div className="text-xs font-semibold text-gray-500">TERMS</div>
                <div className="text-sm text-gray-600 whitespace-pre-wrap mt-2">
                  {settings.customTerms}
                </div>
              </div>
            )}

            {settings.signatureImageUrl && (
              <div className="pt-6">
                <div className="flex justify-end">
                  <div className="text-center">
                    <img
                      src={settings.signatureImageUrl}
                      alt="Signature"
                      className="h-14 w-auto mb-2"
                    />
                    <div className="border-t border-gray-900 pt-1">
                      <div className="text-xs font-medium text-gray-900">
                        Authorized Signatory
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-sm text-gray-600">
          {settings.invoiceFooter || "Thank you for your business!"}
        </div>
      </div>
    </div>
  );
}
