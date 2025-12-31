/**
 * E-Invoice Requirements Card
 * Shows what's needed before e-invoicing
 */

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle, Clock } from "lucide-react"
import type { IInvoice } from "@/types"

interface EInvoiceRequirementsCardProps {
  invoice: IInvoice
}

export function EInvoiceRequirementsCard({ invoice }: EInvoiceRequirementsCardProps) {
  const requirements = [
    {
      id: "gstin",
      label: "Customer GSTIN",
      met: !!invoice.customerGst,
      required: true,
      message: "B2B invoices require customer GSTIN",
    },
    {
      id: "gst-enabled",
      label: "GST Billing",
      met: invoice.gstEnabled,
      required: true,
      message: "Only GST-enabled invoices can be e-invoiced",
    },
    {
      id: "status",
      label: "Invoice Status",
      met: invoice.status !== "draft",
      required: true,
      message: "Invoice must be sent/paid status",
    },
    {
      id: "not-invoiced",
      label: "Not Already E-Invoiced",
      met: !invoice.irn,
      required: true,
      message: "Invoice already has IRN",
    },
    {
      id: "items",
      label: "Has Line Items",
      met: invoice.items && invoice.items.length > 0,
      required: true,
      message: "Invoice must have line items",
    },
  ]

  const allRequirementsMet = requirements.every((req) => req.met)
  const unmetCount = requirements.filter((req) => !req.met).length

  return (
    <Card className={allRequirementsMet ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {allRequirementsMet ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600" />
              )}
              E-Invoice Requirements
            </CardTitle>
            <CardDescription>
              {allRequirementsMet
                ? "All requirements met. Ready to generate e-invoice."
                : `${unmetCount} requirement${unmetCount !== 1 ? "s" : ""} not met`}
            </CardDescription>
          </div>
          <Badge
            variant={allRequirementsMet ? "default" : "secondary"}
            className={allRequirementsMet ? "bg-green-600" : "bg-amber-600"}
          >
            {allRequirementsMet ? "Ready" : "Pending"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {requirements.map((req) => (
            <div key={req.id} className="flex items-start gap-3 p-2 rounded border border-transparent">
              <div className="mt-0.5 flex-shrink-0">
                {req.met ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${req.met ? "text-green-900" : "text-amber-900"}`}>{req.label}</p>
                <p className={`text-xs ${req.met ? "text-green-700" : "text-amber-700"}`}>{req.message}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
