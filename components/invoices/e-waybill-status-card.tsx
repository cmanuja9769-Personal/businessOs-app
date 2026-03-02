/**
 * E-Way Bill Status Card
 * Displays E-Way Bill number, validity, and status with actions
 */

"use client"

import { type ReactNode, useCallback, useEffect, useState } from "react"
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

type EWayBillStatus = "active" | "cancelled" | "expired" | "expiring"
type EWayBillVisualKey = "expired" | "expiring" | "cancelled" | "default"

function resolveStatus(isExpired: boolean, isExpiringSoon: boolean, detailsStatus?: string): EWayBillStatus {
  if (isExpired) return "expired"
  if (isExpiringSoon) return "expiring"
  return (detailsStatus as EWayBillStatus) || "active"
}

function resolveVisualKey(isExpired: boolean, isExpiringSoon: boolean, detailsStatus?: string): EWayBillVisualKey {
  if (isExpired) return "expired"
  if (isExpiringSoon) return "expiring"
  if (detailsStatus === "cancelled") return "cancelled"
  return "default"
}

function resolveValidityTextClass(isExpired: boolean, isExpiringSoon: boolean): string {
  if (isExpired) return "text-red-600"
  if (isExpiringSoon) return "text-orange-600"
  return "text-green-600"
}

const STATUS_COLOR_MAP: Record<EWayBillVisualKey, string> = {
  expired: "border-red-200 bg-red-50",
  expiring: "border-orange-200 bg-orange-50",
  cancelled: "border-gray-200 bg-gray-50",
  default: "border-blue-200 bg-blue-50",
}

const STATUS_LABEL_MAP: Record<EWayBillVisualKey, string> = {
  expired: "Expired",
  expiring: "Expiring Soon",
  cancelled: "Cancelled",
  default: "Active",
}

const STATUS_ICON_MAP: Record<EWayBillVisualKey, ReactNode> = {
  expired: <AlertCircle className="w-5 h-5 text-red-600" />,
  expiring: <Clock className="w-5 h-5 text-orange-600" />,
  cancelled: <AlertCircle className="w-5 h-5 text-gray-600" />,
  default: <CheckCircle2 className="w-5 h-5 text-blue-600" />,
}

export function EWayBillStatusCard({ invoice, onUpdate }: EWayBillStatusCardProps) {
  const [loading, setLoading] = useState(false)
  const [details, setDetails] = useState<EWayBillData | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>("")

  const loadDetails = useCallback(async () => {
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
  }, [invoice.ewaybillNo])

  useEffect(() => {
    if (invoice.ewaybillNo) {
      loadDetails()
    }
  }, [invoice.ewaybillNo, loadDetails])

  useEffect(() => {
    if (details?.validUpto) {
      const updateTimer = () => {
        setTimeRemaining(EWayBillUtils.getTimeRemaining(details.validUpto))
      }
      updateTimer()
      const interval = setInterval(updateTimer, 60000)
      return () => clearInterval(interval)
    }
  }, [details])

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
  const status = resolveStatus(isExpired, isExpiringSoon, details?.status)
  const visualKey = resolveVisualKey(isExpired, isExpiringSoon, details?.status)
  const validityTextClass = resolveValidityTextClass(isExpired, isExpiringSoon)

  return (
    <Card className={STATUS_COLOR_MAP[visualKey]}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <CardTitle>E-Way Bill</CardTitle>
          </div>
          <Badge variant={EWayBillUtils.getStatusBadgeVariant(status)}>
            {STATUS_ICON_MAP[visualKey]}
            <span className="ml-1">{STATUS_LABEL_MAP[visualKey]}</span>
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
