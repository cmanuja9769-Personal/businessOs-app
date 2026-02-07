/**
 * Update Vehicle Dialog
 * Dialog for updating vehicle number in E-Way Bill
 */

"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Truck, Loader2 } from "lucide-react"
import { eWayBillService, EWayBillUtils } from "@/lib/e-waybill-service"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog"

interface UpdateVehicleDialogProps {
  ewbNo: number
  currentVehicle?: string
  onSuccess?: () => void
}

export function UpdateVehicleDialog({ ewbNo, currentVehicle, onSuccess }: UpdateVehicleDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const initialFormData = {
    vehicleNo: "",
    fromPlace: "",
    fromState: "",
    reasonCode: "4" as "1" | "2" | "3" | "4",
    reasonRem: "",
    transMode: "1" as "1" | "2" | "3" | "4",
    transDocNo: "",
    transDocDate: "",
  }
  const [formData, setFormData] = useState(initialFormData)

  const isDirty = useMemo(() => {
    return formData.vehicleNo !== "" ||
      formData.fromPlace !== "" ||
      formData.fromState !== "" ||
      formData.reasonRem !== "" ||
      formData.transDocNo !== "" ||
      formData.transDocDate !== ""
  }, [formData])

  const handleCloseDialog = useCallback(() => {
    setOpen(false)
    setFormData(initialFormData)
  }, [])

  const {
    showConfirmDialog,
    handleOpenChange,
    confirmDiscard,
    cancelDiscard,
  } = useUnsavedChanges({
    isDirty,
    onClose: handleCloseDialog,
    setOpen,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate vehicle number
    if (!EWayBillUtils.isValidVehicleNumber(formData.vehicleNo)) {
      toast.error("Invalid vehicle number format. Use format: MH12AB1234")
      return
    }

    if (!formData.fromPlace || !formData.fromState) {
      toast.error("Please fill all required fields")
      return
    }

    try {
      setLoading(true)

      await eWayBillService.updateVehicle({
        ewbNo,
        vehicleNo: EWayBillUtils.formatVehicleNumber(formData.vehicleNo),
        fromPlace: formData.fromPlace,
        fromState: parseInt(formData.fromState),
        reasonCode: formData.reasonCode,
        reasonRem: formData.reasonRem || undefined,
        transMode: formData.transMode,
        transDocNo: formData.transDocNo || undefined,
        transDocDate: formData.transDocDate || undefined,
      })

      toast.success("Vehicle updated successfully")
      setOpen(false)
      onSuccess?.()
    } catch (error: any) {
      console.error("Failed to update vehicle:", error)
      toast.error(error.message || "Failed to update vehicle")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Truck className="w-3 h-3 mr-1" />
          {currentVehicle ? "Update Vehicle" : "Add Vehicle"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Update Vehicle Details</DialogTitle>
            <DialogDescription>
              {currentVehicle ? `Current: ${currentVehicle}` : "Add vehicle details to E-Way Bill"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Vehicle Number */}
            <div className="space-y-2">
              <Label htmlFor="vehicleNo">
                Vehicle Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="vehicleNo"
                placeholder="MH12AB1234"
                value={formData.vehicleNo}
                onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value.toUpperCase() })}
                required
              />
              <p className="text-xs text-muted-foreground">Format: MH12AB1234 (no spaces)</p>
            </div>

            {/* Transport Mode */}
            <div className="space-y-2">
              <Label htmlFor="transMode">
                Transport Mode <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.transMode}
                onValueChange={(value: "1" | "2" | "3" | "4") => setFormData({ ...formData, transMode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Road</SelectItem>
                  <SelectItem value="2">Rail</SelectItem>
                  <SelectItem value="3">Air</SelectItem>
                  <SelectItem value="4">Ship</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* From Place */}
            <div className="space-y-2">
              <Label htmlFor="fromPlace">
                From Place <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fromPlace"
                placeholder="Mumbai"
                value={formData.fromPlace}
                onChange={(e) => setFormData({ ...formData, fromPlace: e.target.value })}
                required
              />
            </div>

            {/* From State */}
            <div className="space-y-2">
              <Label htmlFor="fromState">
                From State Code <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.fromState} onValueChange={(value) => setFormData({ ...formData, fromState: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">01 - Jammu and Kashmir</SelectItem>
                  <SelectItem value="2">02 - Himachal Pradesh</SelectItem>
                  <SelectItem value="3">03 - Punjab</SelectItem>
                  <SelectItem value="4">04 - Chandigarh</SelectItem>
                  <SelectItem value="5">05 - Uttarakhand</SelectItem>
                  <SelectItem value="6">06 - Haryana</SelectItem>
                  <SelectItem value="7">07 - Delhi</SelectItem>
                  <SelectItem value="8">08 - Rajasthan</SelectItem>
                  <SelectItem value="9">09 - Uttar Pradesh</SelectItem>
                  <SelectItem value="10">10 - Bihar</SelectItem>
                  <SelectItem value="19">19 - West Bengal</SelectItem>
                  <SelectItem value="24">24 - Gujarat</SelectItem>
                  <SelectItem value="27">27 - Maharashtra</SelectItem>
                  <SelectItem value="29">29 - Karnataka</SelectItem>
                  <SelectItem value="32">32 - Kerala</SelectItem>
                  <SelectItem value="33">33 - Tamil Nadu</SelectItem>
                  <SelectItem value="36">36 - Telangana</SelectItem>
                  <SelectItem value="37">37 - Andhra Pradesh</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reason Code */}
            <div className="space-y-2">
              <Label htmlFor="reasonCode">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.reasonCode}
                onValueChange={(value: "1" | "2" | "3" | "4") => setFormData({ ...formData, reasonCode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Breakdown</SelectItem>
                  <SelectItem value="2">Transhipment</SelectItem>
                  <SelectItem value="3">Others</SelectItem>
                  <SelectItem value="4">First Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reason Remarks (optional for "Others") */}
            {formData.reasonCode === "3" && (
              <div className="space-y-2">
                <Label htmlFor="reasonRem">Reason Remarks</Label>
                <Textarea
                  id="reasonRem"
                  placeholder="Enter reason for vehicle update..."
                  value={formData.reasonRem}
                  onChange={(e) => setFormData({ ...formData, reasonRem: e.target.value })}
                  rows={2}
                />
              </div>
            )}

            {/* Transport Document (optional) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transDocNo">Transport Doc No</Label>
                <Input
                  id="transDocNo"
                  placeholder="Optional"
                  value={formData.transDocNo}
                  onChange={(e) => setFormData({ ...formData, transDocNo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transDocDate">Doc Date</Label>
                <Input
                  id="transDocDate"
                  type="date"
                  value={formData.transDocDate}
                  onChange={(e) => setFormData({ ...formData, transDocDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Vehicle"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <UnsavedChangesDialog
      open={showConfirmDialog}
      onConfirm={confirmDiscard}
      onCancel={cancelDiscard}
    />
    </>
  )
}
