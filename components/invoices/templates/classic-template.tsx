import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { IInvoice } from "@/types";
import type { ISettings } from "@/app/settings/actions";

interface ClassicTemplateProps {
  invoice: IInvoice;
  settings: ISettings;
}

export function ClassicTemplate({ invoice, settings }: ClassicTemplateProps) {
  const primaryColor = settings.templateColor || "#6366f1";

  return (
    <div
      className="bg-white w-full"
      style={{ "--invoice-primary": primaryColor } as React.CSSProperties}
    >
      <div className="mx-auto w-full max-w-210 min-h-297 p-8 print:p-6 print:min-h-0">
        <div className="space-y-6">
          {/* Header with Logo and Company Info */}
          <div className="flex justify-between items-start border-b-2 border-(--invoice-primary) pb-6">
            <div className="flex-1">
              {settings.businessLogoUrl && (
                <img
                  src={settings.businessLogoUrl}
                  alt="Company Logo"
                  className="h-20 w-auto object-contain mb-3"
                />
              )}
              <h1 className="text-2xl font-bold mb-2 text-(--invoice-primary)">
                {settings.businessName}
              </h1>
              {settings.businessAddress && (
                <p className="text-sm text-gray-600 mb-1 max-w-xs">
                  {settings.businessAddress}
                </p>
              )}
              <div className="text-sm text-gray-600 space-y-0.5 mt-2">
                {settings.businessPhone && (
                  <p>Phone: {settings.businessPhone}</p>
                )}
                {settings.businessEmail && (
                  <p>Email: {settings.businessEmail}</p>
                )}
                {settings.businessGst && (
                  <p className="font-medium mt-1">
                    GSTIN: {settings.businessGst}
                  </p>
                )}
                {settings.businessPan && (
                  <p className="font-medium">PAN: {settings.businessPan}</p>
                )}
              </div>
            </div>

            <div className="text-right">
              <h2 className="text-3xl font-bold mb-2 text-(--invoice-primary)">
                INVOICE
              </h2>
              <div className="text-sm space-y-1">
                <p className="font-semibold">{invoice.invoiceNo}</p>
                <p className="text-gray-600">
                  Date: {format(invoice.invoiceDate, "dd MMM yyyy")}
                </p>
                <p className="text-gray-600">
                  Due: {format(invoice.dueDate, "dd MMM yyyy")}
                </p>
                <Badge
                  variant={invoice.status === "paid" ? "default" : "secondary"}
                  className={
                    invoice.status === "paid"
                      ? "mt-2 bg-(--invoice-primary) hover:bg-(--invoice-primary)/90"
                      : "mt-2"
                  }
                >
                  {invoice.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Bill To Section */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1">
              <h3 className="text-sm font-bold mb-2 text-(--invoice-primary)">
                BILL TO:
              </h3>
              <p className="font-semibold text-base">{invoice.customerName}</p>
              {invoice.customerAddress && (
                <p className="text-sm text-gray-600">
                  {invoice.customerAddress}
                </p>
              )}
              {invoice.customerPhone && (
                <p className="text-sm text-gray-600">
                  Phone: {invoice.customerPhone}
                </p>
              )}
              {invoice.customerGst && (
                <p className="text-sm font-medium mt-2">
                  GSTIN: {invoice.customerGst}
                </p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="mt-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-(--invoice-primary) bg-(--invoice-primary)/10">
                  <th className="text-left py-3 px-4 font-semibold text-(--invoice-primary)">
                    #
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-(--invoice-primary)">
                    Description
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-(--invoice-primary)">
                    Qty
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-(--invoice-primary)">
                    Rate
                  </th>
                  {invoice.gstEnabled && (
                    <th className="text-center py-3 px-4 font-semibold text-(--invoice-primary)">
                      GST%
                    </th>
                  )}
                  <th className="text-right py-3 px-4 font-semibold text-(--invoice-primary)">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-600">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{item.itemName}</div>
                      <div className="text-xs text-gray-500">{item.unit}</div>
                    </td>
                    <td className="py-3 px-4 text-center">{item.quantity}</td>
                    <td className="py-3 px-4 text-right">
                      {settings.currencySymbol}
                      {item.rate.toFixed(2)}
                    </td>
                    {invoice.gstEnabled && (
                      <td className="py-3 px-4 text-center">{item.gstRate}%</td>
                    )}
                    <td className="py-3 px-4 text-right font-medium">
                      {settings.currencySymbol}
                      {item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end mt-6">
            <div className="w-80">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    {settings.currencySymbol}
                    {invoice.subtotal.toFixed(2)}
                  </span>
                </div>
                {invoice.gstEnabled && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">CGST:</span>
                      <span>
                        {settings.currencySymbol}
                        {invoice.cgst.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SGST:</span>
                      <span>
                        {settings.currencySymbol}
                        {invoice.sgst.toFixed(2)}
                      </span>
                    </div>
                    {invoice.igst > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">IGST:</span>
                        <span>
                          {settings.currencySymbol}
                          {invoice.igst.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {invoice.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount:</span>
                    <span>
                      -{settings.currencySymbol}
                      {invoice.discount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="border-t-2 border-(--invoice-primary) pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-(--invoice-primary)">
                      Total:
                    </span>
                    <span className="text-2xl font-bold text-(--invoice-primary)">
                      {settings.currencySymbol}
                      {invoice.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          {settings.bankName && (
            <div className="mt-8 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-semibold mb-3 text-(--invoice-primary)">
                Payment Information:
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p>
                    <span className="font-medium">Bank:</span>{" "}
                    {settings.bankName}
                  </p>
                  <p>
                    <span className="font-medium">Account No:</span>{" "}
                    {settings.bankAccountNo}
                  </p>
                </div>
                <div className="space-y-1">
                  <p>
                    <span className="font-medium">IFSC Code:</span>{" "}
                    {settings.bankIfsc}
                  </p>
                  {settings.upiId && (
                    <p>
                      <span className="font-medium">UPI ID:</span>{" "}
                      {settings.upiId}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Terms & Conditions */}
          {settings.customTerms && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2 text-(--invoice-primary)">
                Terms & Conditions:
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {settings.customTerms}
              </p>
            </div>
          )}

          {/* Footer with Signature */}
          <div className="flex justify-between items-end mt-12 pt-6 border-t">
            <div className="text-sm text-gray-600">
              {settings.invoiceFooter || "Thank you for your business!"}
            </div>
            {settings.signatureImageUrl && (
              <div className="text-center">
                <img
                  src={settings.signatureImageUrl}
                  alt="Signature"
                  className="h-16 w-auto mb-1"
                />
                <div className="border-t border-gray-800 pt-1">
                  <p className="text-sm font-medium">Authorized Signatory</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
