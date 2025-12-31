"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileCheck, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { generateEInvoice } from "@/app/invoices/actions";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GenerateEInvoiceButtonProps {
  invoiceId: string;
  invoiceNo: string;
  customerGst?: string;
  gstEnabled: boolean;
  status?: string;
  irn?: string;
  customerName?: string;
  total?: number;
}

export function GenerateEInvoiceButton({
  invoiceId,
  invoiceNo,
  customerGst,
  gstEnabled,
  status,
  irn,
  customerName,
  total,
}: GenerateEInvoiceButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Check if already e-invoiced
  const hasIRN = !!irn;

  // Validate if invoice can be e-invoiced
  const canGenerateEInvoice = () => {
    if (!customerGst) {
      return {
        valid: false,
        reason: "Customer GST number is required for e-invoicing",
      };
    }
    if (!gstEnabled) {
      return {
        valid: false,
        reason: "E-invoicing is only applicable for GST invoices",
      };
    }
    if (status === "draft") {
      return { valid: false, reason: "Cannot e-invoice draft documents" };
    }
    if (hasIRN) {
      return {
        valid: false,
        reason: "This invoice has already been e-invoiced",
      };
    }
    return { valid: true, reason: "" };
  };

  const validation = canGenerateEInvoice();

  const handleGenerateEInvoice = async () => {
    setIsGenerating(true);
    try {
      // TODO: Replace with actual organizationId when multi-tenancy is implemented (Phase 1)
      const result = await generateEInvoice(invoiceId, "default-org");

      if (result.success) {
        toast.success("E-Invoice generated successfully! IRN received.");
        setIsOpen(false);
        router.refresh();
      } else {
        const error =
          "error" in result ? result.error : "Failed to generate e-invoice";
        toast.error(error || "Failed to generate e-invoice");
      }
    } catch (error) {
      toast.error("An error occurred while generating e-invoice");
    } finally {
      setIsGenerating(false);
    }
  };

  // If already e-invoiced, show badge instead of button
  if (hasIRN) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 gap-2">
        <CheckCircle2 className="w-3 h-3" />
        E-Invoiced
      </Badge>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
          disabled={!validation.valid}
        >
          <FileCheck className="w-4 h-4" />
          Generate E-Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Generate E-Invoice</DialogTitle>
          <DialogDescription>
            Create a government-compliant e-invoice with IRN and QR code
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!validation.valid ? (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{validation.reason}</AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert>
                <FileCheck className="h-4 w-4" />
                <AlertDescription>
                  This will upload your invoice to the Invoice Registration
                  Portal (IRP) for validation. Upon success, you'll receive:
                </AlertDescription>
              </Alert>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                  <div>
                    <p className="font-medium">
                      Invoice Reference Number (IRN)
                    </p>
                    <p className="text-muted-foreground">
                      Unique 64-character identifier
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                  <div>
                    <p className="font-medium">Digitally Signed QR Code</p>
                    <p className="text-muted-foreground">
                      For quick verification
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                  <div>
                    <p className="font-medium">Auto GST Filing</p>
                    <p className="text-muted-foreground">
                      Data sent to GST portal for GSTR-1
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-lg text-xs space-y-1">
                <p>
                  <strong>Invoice:</strong> {invoiceNo}
                </p>
                <p>
                  <strong>Customer:</strong> {customerName || "N/A"}
                </p>
                <p>
                  <strong>GSTIN:</strong> {customerGst}
                </p>
                <p>
                  <strong>Amount:</strong> ₹{total?.toFixed(2) || "0.00"}
                </p>
              </div>

              <Alert>
                <AlertDescription className="text-xs">
                  <strong>Note:</strong> Once generated, the e-invoice cannot be
                  modified. You can cancel it within 24 hours if needed.
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerateEInvoice}
            disabled={isGenerating || !validation.valid}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4 mr-2" />
                Generate E-Invoice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
