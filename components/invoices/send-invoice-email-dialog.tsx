"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Mail, Loader2, Eye, EyeOff } from "lucide-react"
import { sendInvoiceEmail } from "@/app/invoices/actions"
import { getEmailTemplates } from "@/lib/email-templates"
import type { IInvoice } from "@/types"

interface SendInvoiceEmailDialogProps {
  invoice: IInvoice
}

export function SendInvoiceEmailDialog({ invoice }: SendInvoiceEmailDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(invoice.customerGst ? "" : invoice.customerName)
  const [templateId, setTemplateId] = useState("standard")
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const { toast } = useToast()

  const templates = getEmailTemplates()

  const handleSendEmail = async () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const result = await sendInvoiceEmail(invoice.id, email, "default-org")

      if (result.success) {
        toast({
          title: "Email sent!",
          description: `Invoice sent to ${email}`,
        })
        setOpen(false)
        setEmail("")
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to send email",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "An error occurred while sending the email",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedTemplate = templates[templateId]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Mail className="w-4 h-4" />
          Send Email
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Invoice Email</DialogTitle>
          <DialogDescription>Send invoice {invoice.invoiceNo} to customer</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* Email Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Recipient Email *</label>
            <Input
              type="email"
              placeholder="customer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Template</label>
            <Select value={templateId} onValueChange={setTemplateId} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(templates).map(([id, template]) => (
                  <SelectItem key={id} value={id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>}
          </div>

          {/* Template Preview */}
          {selectedTemplate && (
            <div className="space-y-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? "Hide" : "Show"} Email Preview
              </button>

              {showPreview && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted p-3 border-b text-sm">
                    <p className="font-semibold text-foreground">{selectedTemplate.subject}</p>
                    <p className="text-xs text-muted-foreground mt-1">{selectedTemplate.previewText}</p>
                  </div>
                  <div className="p-4 bg-white max-h-96 overflow-y-auto">
                    <div className="text-sm text-muted-foreground space-y-4">
                      <p>Preview with sample data:</p>
                      <div
                        className="prose prose-sm max-w-none text-xs"
                        dangerouslySetInnerHTML={{
                          __html: selectedTemplate.htmlContent
                            .replace(/\{\{customerName\}\}/g, invoice.customerName)
                            .replace(/\{\{invoiceNumber\}\}/g, invoice.invoiceNo)
                            .replace(/\{\{invoiceDate\}\}/g, new Date(invoice.invoiceDate).toLocaleDateString("en-IN"))
                            .replace(/\{\{dueDate\}\}/g, new Date(invoice.dueDate).toLocaleDateString("en-IN"))
                            .replace(/\{\{totalAmount\}\}/g, invoice.total.toFixed(2))
                            .replace(/\{\{subtotal\}\}/g, invoice.subtotal.toFixed(2))
                            .replace(/\{\{taxAmount\}\}/g, (invoice.cgst + invoice.sgst + invoice.igst).toFixed(2)),
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
