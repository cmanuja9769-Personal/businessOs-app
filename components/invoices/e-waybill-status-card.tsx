/**
 * E-Way Bill Status Card
 * Displays E-Way Bill number, validity, and status with actions
 */

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Truck, AlertCircle, CheckCircle2, Clock, Copy, Download, Printer } from "lucide-react"
import { eWayBillService, EWayBillUtils, type EWayBillData } from "@/lib/e-waybill-service"
import type { IInvoice } from "@/types"
import { toast } from "sonner"
import { UpdateVehicleDialog } from "./update-vehicle-dialog"
import { CancelEWayBillDialog } from "./cancel-ewaybill-dialog"
import { ExtendValidityDialog } from "./extend-validity-dialog"

interface EWayBillStatusCardProps {
  invoice: IInvoice
  onUpdate?: () => void
}

export function EWayBillStatusCard({ invoice, onUpdate }: EWayBillStatusCardProps) {
  const [loading, setLoading] = useState(false)
  const [details, setDetails] = useState<EWayBillData | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>("")

  useEffect(() => {
    if (invoice.ewaybillNo) {
      loadDetails()
    }
  }, [invoice.id, invoice.ewaybillNo])

  useEffect(() => {
    if (details?.validUpto) {
      // Update time remaining every minute
      const updateTimer = () => {
        setTimeRemaining(EWayBillUtils.getTimeRemaining(details.validUpto))
      }
      updateTimer()
      const interval = setInterval(updateTimer, 60000) // Update every minute
      return () => clearInterval(interval)
    }
  }, [details])

  const loadDetails = async () => {
    if (!invoice.ewaybillNo) return

    try {
      setLoading(true)
      const data = await eWayBillService.getEWayBillDetails(invoice.ewaybillNo)
      setDetails(data)
    } catch (error) {
      console.error("Failed to load E-Way Bill details:", error)
      toast.error("Failed to load E-Way Bill details")
    } finally {
      setLoading(false)
    }
  }

  const handleCopyEWB = () => {
    if (invoice.ewaybillNo) {
      navigator.clipboard.writeText(invoice.ewaybillNo.toString())
      toast.success("E-Way Bill number copied to clipboard")
    }
  }

  const handleDownloadPDF = async () => {
    if (!invoice.ewaybillNo) return

    try {
      setLoading(true)
      const blob = await eWayBillService.downloadEWayBillPDF(invoice.ewaybillNo)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ewaybill-${invoice.ewaybillNo}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("E-Way Bill PDF downloaded")
    } catch (error) {
      console.error("Failed to download PDF:", error)
      toast.error("Failed to download E-Way Bill PDF")
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = async () => {
    if (!invoice.ewaybillNo) return

    try {
      setLoading(true)
      await eWayBillService.printEWayBill(invoice.ewaybillNo)
      toast.success("Printing E-Way Bill")
    } catch (error) {
      console.error("Failed to print:", error)
      toast.error("Failed to print E-Way Bill")
    } finally {
      setLoading(false)
    }
  }

  if (!invoice.ewaybillNo) {
    return null
  }

  const isExpiringSoon = details?.validUpto ? EWayBillUtils.isExpiringSoon(details.validUpto) : false
  const isExpired = details?.validUpto ? EWayBillUtils.isExpired(details.validUpto) : false
  type EWayBillStatus = "active" | "cancelled" | "expired" | "expiring"
  let status: EWayBillStatus
  if (isExpired) {
    status = "expired"
  } else if (isExpiringSoon) {
    status = "expiring"
  } else {
    status = (details?.status as EWayBillStatus) || "active"
  }

  let validityTextClass = "text-green-600"
  if (isExpired) validityTextClass = "text-red-600"
  else if (isExpiringSoon) validityTextClass = "text-orange-600"

  const getStatusColor = () => {
    if (isExpired) return "border-red-200 bg-red-50"
    if (isExpiringSoon) return "border-orange-200 bg-orange-50"
    if (details?.status === "cancelled") return "border-gray-200 bg-gray-50"
    return "border-blue-200 bg-blue-50"
  }

  const getStatusIcon = () => {
    if (isExpired) return <AlertCircle className="w-5 h-5 text-red-600" />
    if (isExpiringSoon) return <Clock className="w-5 h-5 text-orange-600" />
    if (details?.status === "cancelled") return <AlertCircle className="w-5 h-5 text-gray-600" />
    return <CheckCircle2 className="w-5 h-5 text-blue-600" />
  }

  const getStatusLabel = () => {
    if (isExpired) return "Expired"
    if (isExpiringSoon) return "Expiring Soon"
    if (details?.status === "cancelled") return "Cancelled"
    return "Active"
  }

  return (
    <Card className={getStatusColor()}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <CardTitle>E-Way Bill</CardTitle>
          </div>
          <Badge variant={EWayBillUtils.getStatusBadgeVariant(status)}>
            {getStatusIcon()}
            <span className="ml-1">{getStatusLabel()}</span>
          </Badge>
        </div>
        <CardDescription>Government-generated e-way bill for goods transportation</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && !details ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-muted-foreground">Loading E-Way Bill details...</span>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {/* E-Way Bill Number */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">E-Way Bill Number</p>
                <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                  <code className="text-sm font-mono text-gray-600">
                    {EWayBillUtils.formatEWayBillNo(invoice.ewaybillNo)}
                  </code>
                  <Button variant="ghost" size="sm" onClick={handleCopyEWB}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-xs text-gray-600">
                  Generated: {invoice.ewaybillDate && new Date(invoice.ewaybillDate).toLocaleString()}
                </p>
              </div>

              {/* Validity */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Validity</p>
                <div className="p-2 bg-white rounded border border-gray-200">
                  <p className="text-sm font-semibold text-gray-800">
                    {details?.validUpto && new Date(details.validUpto).toLocaleString()}
                  </p>
                  <p className={`text-xs mt-1 ${validityTextClass}`}>
                    {timeRemaining}
                  </p>
                </div>
                {details?.distance && (
                  <p className="text-xs text-gray-600">Distance: {details.distance} km</p>
                )}
              </div>
            </div>

            {/* Vehicle Information */}
            {details?.vehicleNo && (
              <div className="p-3 bg-white rounded border border-gray-200 space-y-2">
                <p className="text-sm font-medium text-gray-700">Vehicle Information</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{details.vehicleNo}</p>
                    <p className="text-xs text-gray-600">
                      Transport Mode: {details.transportMode ? EWayBillUtils.getTransportModeLabel(details.transportMode) : "Road"}
                    </p>
                  </div>
                  <UpdateVehicleDialog
                    ewbNo={invoice.ewaybillNo}
                    currentVehicle={details.vehicleNo}
                    onSuccess={() => {
                      loadDetails()
                      onUpdate?.()
                    }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={loading}>
                {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
                Download PDF
              </Button>

              <Button variant="outline" size="sm" onClick={handlePrint} disabled={loading}>
                <Printer className="w-3 h-3 mr-1" />
                Print
              </Button>

              {!isExpired && details?.status !== "cancelled" && (
                <>
                  {!details?.vehicleNo && (
                    <UpdateVehicleDialog
                      ewbNo={invoice.ewaybillNo}
                      currentVehicle={details?.vehicleNo}
                      onSuccess={() => {
                        loadDetails()
                        onUpdate?.()
                      }}
                    />
                  )}

                  {(isExpiringSoon || isExpired) && (
                    <ExtendValidityDialog
                      ewbNo={invoice.ewaybillNo}
                      currentVehicle={details?.vehicleNo || ""}
                      onSuccess={() => {
                        loadDetails()
                        onUpdate?.()
                      }}
                    />
                  )}

                  <CancelEWayBillDialog
                    ewbNo={invoice.ewaybillNo}
                    invoiceNo={invoice.invoiceNo}
                    onSuccess={() => {
                      loadDetails()
                      onUpdate?.()
                    }}
                  />
                </>
              )}
            </div>

            {/* Warnings */}
            {isExpiringSoon && (
              <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded">
                <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                <div className="text-xs text-orange-800">
                  <p className="font-medium">E-Way Bill expiring soon!</p>
                  <p>Please extend validity or complete the delivery before expiry.</p>
                </div>
              </div>
            )}

            {isExpired && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                <div className="text-xs text-red-800">
                  <p className="font-medium">E-Way Bill has expired!</p>
                  <p>You need to generate a new E-Way Bill for transportation.</p>
                </div>
              </div>
            )}

            {details?.status === "cancelled" && (
              <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded">
                <AlertCircle className="w-4 h-4 text-gray-600 mt-0.5" />
                <div className="text-xs text-gray-800">
                  <p className="font-medium">E-Way Bill has been cancelled</p>
                  <p>This E-Way Bill is no longer valid for transportation.</p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
