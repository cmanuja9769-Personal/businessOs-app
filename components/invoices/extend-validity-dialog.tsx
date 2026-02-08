/**
 * Extend Validity Dialog
 * Dialog for extending E-Way Bill validity
 */

"use client"

import { useState } from "react"
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
import { Clock, Loader2 } from "lucide-react"
import { eWayBillService } from "@/lib/e-waybill-service"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"

interface ExtendValidityDialogProps {
  ewbNo: number
  currentVehicle: string
  onSuccess?: () => void
}

export function ExtendValidityDialog({ ewbNo, currentVehicle, onSuccess }: ExtendValidityDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    vehicleNo: currentVehicle,
    fromPlace: "",
    fromState: "",
    remainingDistance: "",
    reasonCode: "3" as "1" | "2" | "3" | "4" | "5",
    reasonRem: "",
    consignmentStatus: "M" as "M" | "T",
    transMode: "1" as "1" | "2" | "3" | "4",
    transDocNo: "",
    transDocDate: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.vehicleNo || !formData.fromPlace || !formData.fromState || !formData.remainingDistance) {
      toast.error("Please fill all required fields")
      return
    }

    const distance = parseInt(formData.remainingDistance)
    if (isNaN(distance) || distance <= 0) {
      toast.error("Please enter a valid remaining distance")
      return
    }

    try {
      setLoading(true)

      await eWayBillService.extendValidity({
        ewbNo,
        vehicleNo: formData.vehicleNo,
        fromPlace: formData.fromPlace,
        fromState: parseInt(formData.fromState),
        remainingDistance: distance,
        transDocNo: formData.transDocNo || undefined,
        transDocDate: formData.transDocDate || undefined,
        reasonCode: formData.reasonCode,
        reasonRem: formData.reasonRem || undefined,
        consignmentStatus: formData.consignmentStatus,
        transMode: formData.transMode,
      })

      toast.success("E-Way Bill validity extended successfully")
      setOpen(false)
      onSuccess?.()
    } catch (error: unknown) {
      console.error("Failed to extend validity:", error)
      toast.error(error instanceof Error ? error.message : "Failed to extend validity")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-orange-50 hover:bg-orange-100 border-orange-200">
          <Clock className="w-3 h-3 mr-1" />
          Extend Validity
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Extend E-Way Bill Validity
            </DialogTitle>
            <DialogDescription>
              Extend the validity period for delayed shipments
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
            </div>

            {/* Consignment Status */}
            <div className="space-y-2">
              <Label htmlFor="consignmentStatus">
                Consignment Status <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.consignmentStatus}
                onValueChange={(value: "M" | "T") => setFormData({ ...formData, consignmentStatus: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">In Movement</SelectItem>
                  <SelectItem value="T">In Transit</SelectItem>
                </SelectContent>
              </Select>
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
                Current Location <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fromPlace"
                placeholder="Current location of goods"
                value={formData.fromPlace}
                onChange={(e) => setFormData({ ...formData, fromPlace: e.target.value })}
                required
              />
            </div>

            {/* From State */}
            <div className="space-y-2">
              <Label htmlFor="fromState">
                State Code <span className="text-red-500">*</span>
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

            {/* Remaining Distance */}
            <div className="space-y-2">
              <Label htmlFor="remainingDistance">
                Remaining Distance (KM) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="remainingDistance"
                type="number"
                placeholder="Distance left to destination"
                value={formData.remainingDistance}
                onChange={(e) => setFormData({ ...formData, remainingDistance: e.target.value })}
                required
                min="1"
              />
            </div>

            {/* Reason Code */}
            <div className="space-y-2">
              <Label htmlFor="reasonCode">
                Extension Reason <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.reasonCode}
                onValueChange={(value: "1" | "2" | "3" | "4" | "5") => setFormData({ ...formData, reasonCode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Natural Calamity</SelectItem>
                  <SelectItem value="2">Law & Order Situation</SelectItem>
                  <SelectItem value="3">Transhipment</SelectItem>
                  <SelectItem value="4">Accident</SelectItem>
                  <SelectItem value="5">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reason Remarks */}
            {formData.reasonCode === "5" && (
              <div className="space-y-2">
                <Label htmlFor="reasonRem">Reason Details</Label>
                <Textarea
                  id="reasonRem"
                  placeholder="Provide details for extension reason..."
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extending...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Extend Validity
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
