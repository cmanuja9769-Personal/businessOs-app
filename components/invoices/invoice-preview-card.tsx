"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatusBadge, type DocumentStatus } from "@/components/ui/status-badge"
import { Download, Mail, Truck, CheckCircle2, AlertCircle, Clock } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { EWayBillUtils } from "@/lib/e-waybill-service"

interface InvoicePreviewCardProps {
  id: string
  invoiceNo: string
  customerName: string
  amount: number
  date: Date
  dueDate: Date
  status: "draft" | "sent" | "paid" | "overdue"
  documentType: string
  ewaybillNo?: number | null
  ewaybillStatus?: string | null
  ewaybillValidUpto?: string | null
}

export function InvoicePreviewCard({
  id,
  invoiceNo,
  customerName,
  amount,
  date,
  dueDate,
  status,
  documentType,
  ewaybillNo,
  ewaybillStatus,
  ewaybillValidUpto,
}: InvoicePreviewCardProps) {
  const isOverdue = new Date() > dueDate && status !== "paid"

  // E-Way Bill status helpers
  const isEWBRequired = EWayBillUtils.isEWayBillRequired(amount)
  const isEWBExpiring = ewaybillValidUpto ? EWayBillUtils.isExpiringSoon(ewaybillValidUpto) : false
  const isEWBExpired = ewaybillValidUpto ? EWayBillUtils.isExpired(ewaybillValidUpto) : false

  const getEWayBillBadge = () => {
    if (!isEWBRequired) {
      return (
        <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-300">
          <Truck className="w-3 h-3 mr-1" />
          Not Required
        </Badge>
      )
    }

    if (!ewaybillNo) {
      return (
        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
          <AlertCircle className="w-3 h-3 mr-1" />
          EWB Required
        </Badge>
      )
    }

    if (isEWBExpired) {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="w-3 h-3 mr-1" />
          EWB Expired
        </Badge>
      )
    }

    if (isEWBExpiring) {
      return (
        <Badge variant="secondary" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
          <Clock className="w-3 h-3 mr-1" />
          EWB Expiring
        </Badge>
      )
    }

    if (ewaybillStatus === "cancelled") {
      return (
        <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-300">
          <Truck className="w-3 h-3 mr-1" />
          EWB Cancelled
        </Badge>
      )
    }

    return (
      <Badge variant="default" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        EWB Active
      </Badge>
    )
  }

  return (
    <Link href={`/invoices/${id}`} className="block">
      <Card className="mx-3 p-4 hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base sm:text-lg font-semibold font-mono truncate">{invoiceNo}</h3>
              <Badge variant="outline" className="flex-shrink-0 text-xs">
                {documentType}
              </Badge>
              {getEWayBillBadge()}
            </div>

            <p className="text-sm text-muted-foreground mb-3 truncate">{customerName}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
              <div>
                <span className="text-muted-foreground">Issue Date</span>
                <p className="font-medium">{format(date, "dd MMM yyyy")}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Due Date</span>
                <p className="font-medium">{format(dueDate, "dd MMM yyyy")}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Amount</span>
                <p className="font-semibold">₹{amount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <StatusBadge 
              status={isOverdue ? "overdue" : status as DocumentStatus} 
              className="text-xs sm:text-sm px-3"
            />

            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <Mail className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
