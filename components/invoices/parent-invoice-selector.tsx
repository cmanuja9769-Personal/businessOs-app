"use client";

import { useEffect, useMemo } from "react";
import { IInvoice } from "@/types";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { FileText, Calendar, User, DollarSign } from "lucide-react";

interface ParentInvoiceSelectorProps {
  invoices: IInvoice[];
  selectedInvoiceId?: string;
  onSelect: (invoice: IInvoice | null) => void;
  documentType: "credit_note" | "debit_note";
}

export function ParentInvoiceSelector({
  invoices,
  selectedInvoiceId,
  onSelect,
  documentType,
}: ParentInvoiceSelectorProps) {
  const availableInvoices = invoices.filter(
    (inv) => inv.documentType === "invoice"
  );

  const selectedInvoice = useMemo(() => {
    if (!selectedInvoiceId) return null;
    return availableInvoices.find((inv) => inv.id === selectedInvoiceId) || null;
  }, [selectedInvoiceId, availableInvoices]);

  useEffect(() => {
    if (selectedInvoiceId) {
      const invoice = availableInvoices.find(
        (inv) => inv.id === selectedInvoiceId
      );
      if (invoice) {
        onSelect(invoice);
      }
    }
  }, [selectedInvoiceId]);

  const handleSelectInvoice = (invoiceId: string) => {
    const invoice = availableInvoices.find((inv) => inv.id === invoiceId);
    onSelect(invoice || null);
  };

  const handleClear = () => {
    onSelect(null);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          Select Original Invoice{" "}
          <span className="text-muted-foreground text-xs">
            (
            {documentType === "credit_note"
              ? "for return/refund"
              : "for additional charges"}
            )
          </span>
        </Label>
        <div className="flex gap-2">
          <Select
            value={selectedInvoice?.id || ""}
            onValueChange={handleSelectInvoice}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select an invoice..." />
            </SelectTrigger>
            <SelectContent>
              {availableInvoices.map((invoice) => (
                <SelectItem key={invoice.id} value={invoice.id}>
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium">{invoice.invoiceNo}</span>
                    <span className="text-muted-foreground">-</span>
                    <span className="text-sm">{invoice.customerName}</span>
                    <span className="text-muted-foreground">-</span>
                    <span className="text-sm">₹{invoice.total.toFixed(2)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedInvoice && (
            <Button variant="outline" onClick={handleClear} type="button">
              Clear
            </Button>
          )}
        </div>
      </div>

      {selectedInvoice && (
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Invoice Number
                  </p>
                  <p className="font-medium">{selectedInvoice.invoiceNo}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedInvoice.customerName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Invoice Date</p>
                  <p className="font-medium">
                    {format(
                      new Date(selectedInvoice.invoiceDate),
                      "dd MMM yyyy"
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <DollarSign className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="font-medium">
                    ₹{selectedInvoice.total.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                Invoice Items ({selectedInvoice.items.length})
              </p>
              <div className="space-y-1">
                {selectedInvoice.items.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.itemName}</span>
                    <span className="text-muted-foreground">
                      {item.quantity} × ₹{item.rate.toFixed(2)}
                    </span>
                  </div>
                ))}
                {selectedInvoice.items.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{selectedInvoice.items.length - 3} more items
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
