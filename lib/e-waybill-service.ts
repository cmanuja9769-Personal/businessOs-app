/**
 * E-Way Bill Service - Frontend API for E-Way Bill generation and management
 * This service handles all e-way bill operations and integrates with backend APIs
 */

export type TransportMode = "1" | "2" | "3" | "4"

export type ReasonCode = "1" | "2" | "3" | "4"

export interface EWayBillData {
  ewbNo: number
  ewbDate: string
  validUpto: string
  status: "active" | "cancelled" | "expired"
  distance?: number
  vehicleNo?: string
  transportMode?: TransportMode
  vehicleType?: "regular" | "over_dimensional"
}

export interface EWayBillResponse {
  success: boolean
  data: {
    ewbNo: number
    ewbDate: string
    validUpto: string
  }
  message: string
}

export interface UpdateVehicleRequest {
  ewbNo: number
  vehicleNo: string
  fromPlace: string
  fromState: number
  reasonCode: ReasonCode
  reasonRem?: string
  transMode: TransportMode
  transDocNo?: string
  transDocDate?: string
  vehicleType?: "regular" | "over_dimensional"
}

export interface CancelEWayBillRequest {
  ewbNo: number
  cancelRsnCode: ReasonCode
  cancelRmrk: string
}

export interface ExtendValidityRequest {
  ewbNo: number
  vehicleNo: string
  fromPlace: string
  fromState: number
  remainingDistance: number
  transDocNo?: string
  transDocDate?: string
  reasonCode: "1" | "2" | "3" | "4" | "5" // 1=Natural Calamity, 2=Law & Order, 3=Transhipment, 4=Accident, 5=Others
  reasonRem?: string
  consignmentStatus: "M" | "T"
  transMode: TransportMode
}

export interface EWayBillQueueJob {
  id: string
  invoiceId: string
  status: "pending" | "processing" | "success" | "failed"
  ewbNo?: number
  error?: string
  createdAt: Date
  updatedAt: Date
}

export interface PortalEWayBill {
  ewbNo: number
  ewbDate: string
  genGstin: string
  genLglNm: string
  docNo: string
  docDate: string
  fromGstin: string
  fromTrdNm: string
  toGstin: string
  toTrdNm: string
  totalValue: number
  cgstValue: number
  sgstValue: number
  igstValue: number
  cessValue: number
  transMode: string
  distance: number
  vehicleNo?: string
  status: string
  validUpto: string
}

/**
 * E-Way Bill Service Class
 * Provides methods for E-Way Bill generation, vehicle updates, cancellation, and management
 */
export class EWayBillService {
  private baseUrl: string

  constructor(baseUrl = "http://localhost:3001/api/v1/e-waybill") {
    this.baseUrl = baseUrl
  }

  /**
   * Get request headers (backend handles auth via cookies/sessions)
   */
  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
    }
  }

  /**
   * Generate E-Way Bill for an invoice
   */
  async generateEWayBill(invoiceId: string): Promise<EWayBillResponse> {
    const url = `${this.baseUrl}/generate`
    
    const response = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ invoiceId }),
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to generate E-Way Bill")
    }

    const data = await response.json()
    return data
  }

  /**
   * Get E-Way Bill details
   */
  async getEWayBillDetails(ewbNo: number): Promise<EWayBillData> {
    try {
      const headers = this.getHeaders()
      const response = await fetch(`${this.baseUrl}/${ewbNo}`, {
        headers,
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to get E-Way Bill details")
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error("[EWayBillService] Failed to get E-Way Bill details:", error)
      throw error
    }
  }

  /**
   * Update vehicle number for E-Way Bill
   */
  async updateVehicle(data: UpdateVehicleRequest): Promise<void> {
    try {
      const headers = this.getHeaders()
      const response = await fetch(`${this.baseUrl}/update-vehicle`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to update vehicle")
      }
    } catch (error) {
      console.error("[EWayBillService] Failed to update vehicle:", error)
      throw error
    }
  }

  /**
   * Cancel E-Way Bill (within 24 hours)
   */
  async cancelEWayBill(data: CancelEWayBillRequest): Promise<void> {
    try {
      const headers = this.getHeaders()
      const response = await fetch(`${this.baseUrl}/cancel`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to cancel E-Way Bill")
      }
    } catch (error) {
      console.error("[EWayBillService] Failed to cancel E-Way Bill:", error)
      throw error
    }
  }

  /**
   * Extend validity of E-Way Bill
   */
  async extendValidity(data: ExtendValidityRequest): Promise<void> {
    try {
      const headers = this.getHeaders()
      const response = await fetch(`${this.baseUrl}/extend-validity`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to extend validity")
      }
    } catch (error) {
      console.error("[EWayBillService] Failed to extend validity:", error)
      throw error
    }
  }

  /**
   * Get E-Way Bills generated by others for your GSTIN
   */
  async getGeneratedByOthers(date: string): Promise<PortalEWayBill[]> {
    try {
      const headers = this.getHeaders()
      const response = await fetch(`${this.baseUrl}/generated-by-others?date=${date}`, {
        headers,
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to get E-Way Bills from portal")
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error("[EWayBillService] Failed to get portal E-Way Bills:", error)
      throw error
    }
  }

  /**
   * Sync E-Way Bills from government portal
   * Fetches E-Way Bills and links them to existing invoices
   */
  async syncFromPortal(date?: string): Promise<{
    success: boolean
    data: {
      message: string
      summary: {
        total: number
        synced: number
        updated: number
        skipped: number
      }
      ewayBills: EWayBillData[]
    }
  }> {
    try {
      const headers = this.getHeaders()
      const url = date 
        ? `${this.baseUrl}/sync?date=${date}`
        : `${this.baseUrl}/sync`
      
      const response = await fetch(url, {
        method: "POST",
        headers,
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to sync E-Way Bills")
      }

      return await response.json()
    } catch (error) {
      console.error("[EWayBillService] Failed to sync E-Way Bills:", error)
      throw error
    }
  }

  /**
   * Queue E-Way Bill generation (async processing)
   */
  async queueEWayBillGeneration(invoiceId: string): Promise<EWayBillQueueJob> {
    try {
      const headers = this.getHeaders()
      const response = await fetch(`${this.baseUrl}/queue`, {
        method: "POST",
        headers,
        body: JSON.stringify({ invoiceId }),
      })

      if (!response.ok) {
        throw new Error("Failed to queue E-Way Bill generation")
      }

      return await response.json()
    } catch (error) {
      console.error("[EWayBillService] Failed to queue E-Way Bill:", error)
      throw error
    }
  }

  /**
   * Get the status of a queued E-Way Bill job
   */
  async getJobStatus(jobId: string): Promise<EWayBillQueueJob> {
    try {
      const headers = this.getHeaders()
      const response = await fetch(`${this.baseUrl}/job/${jobId}`, {
        headers,
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error("Failed to get job status")
      }

      return await response.json()
    } catch (error) {
      console.error("[EWayBillService] Failed to get job status:", error)
      throw error
    }
  }

  /**
   * Download E-Way Bill PDF
   */
  async downloadEWayBillPDF(ewbNo: number): Promise<Blob> {
    try {
      const headers = this.getHeaders()
      const response = await fetch(`${this.baseUrl}/download-pdf/${ewbNo}`, {
        headers,
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error("Failed to download E-Way Bill PDF")
      }

      return await response.blob()
    } catch (error) {
      console.error("[EWayBillService] Failed to download PDF:", error)
      throw error
    }
  }

  /**
   * Print E-Way Bill
   */
  async printEWayBill(ewbNo: number): Promise<void> {
    try {
      const blob = await this.downloadEWayBillPDF(ewbNo)
      const url = window.URL.createObjectURL(blob)
      const printWindow = window.open(url, "_blank")
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      }
    } catch (error) {
      console.error("[EWayBillService] Failed to print E-Way Bill:", error)
      throw error
    }
  }
}

// Export singleton instance
// Points to backend API running on localhost:3001
export const eWayBillService = new EWayBillService("http://localhost:3001/api/v1/e-waybill")

/**
 * Utility functions for E-Way Bill
 */
export const EWayBillUtils = {
  /**
   * Check if E-Way Bill is required for invoice
   */
  isEWayBillRequired(total: number, _isInterState: boolean = false): boolean {
    // E-Way Bill required for goods > ₹50,000
    return total >= 50000
  },

  /**
   * Check if E-Way Bill is expiring soon (< 4 hours)
   */
  isExpiringSoon(validUpto: string): boolean {
    const expiryDate = new Date(validUpto)
    const now = new Date()
    const hoursDiff = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursDiff > 0 && hoursDiff < 4
  },

  /**
   * Check if E-Way Bill is expired
   */
  isExpired(validUpto: string): boolean {
    const expiryDate = new Date(validUpto)
    const now = new Date()
    return now > expiryDate
  },

  /**
   * Get time remaining until expiry
   */
  getTimeRemaining(validUpto: string): string {
    const expiryDate = new Date(validUpto)
    const now = new Date()
    const diffMs = expiryDate.getTime() - now.getTime()

    if (diffMs <= 0) {
      return "Expired"
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days} day${days > 1 ? "s" : ""} remaining`
    }

    return `${hours}h ${minutes}m remaining`
  },

  /**
   * Format E-Way Bill number for display
   */
  formatEWayBillNo(ewbNo: number): string {
    const str = ewbNo.toString()
    // Format as 123456-789012 for better readability
    if (str.length === 12) {
      return `${str.slice(0, 6)}-${str.slice(6)}`
    }
    return str
  },

  /**
   * Get status badge variant
   */
  getStatusBadgeVariant(
    status: "active" | "cancelled" | "expired" | "expiring",
  ): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "active":
        return "default"
      case "expiring":
        return "secondary"
      case "expired":
        return "destructive"
      case "cancelled":
        return "outline"
      default:
        return "outline"
    }
  },

  /**
   * Get transport mode label
   */
  getTransportModeLabel(mode: string): string {
    const modes: Record<string, string> = {
      "1": "Road",
      "2": "Rail",
      "3": "Air",
      "4": "Ship",
    }
    return modes[mode] || "Unknown"
  },

  /**
   * Get cancel reason label
   */
  getCancelReasonLabel(code: string): string {
    const reasons: Record<string, string> = {
      "1": "Duplicate",
      "2": "Order Cancelled",
      "3": "Data Entry Mistake",
      "4": "Others",
    }
    return reasons[code] || "Unknown"
  },

  /**
   * Get extend reason label
   */
  getExtendReasonLabel(code: string): string {
    const reasons: Record<string, string> = {
      "1": "Natural Calamity",
      "2": "Law & Order Situation",
      "3": "Transhipment",
      "4": "Accident",
      "5": "Others",
    }
    return reasons[code] || "Unknown"
  },

  /**
   * Get vehicle update reason label
   */
  getVehicleReasonLabel(code: string): string {
    const reasons: Record<string, string> = {
      "1": "Breakdown",
      "2": "Transhipment",
      "3": "Others",
      "4": "First Time",
    }
    return reasons[code] || "Unknown"
  },

  /**
   * Validate vehicle number format
   */
  isValidVehicleNumber(vehicleNo: string): boolean {
    // Format: MH12AB1234 (2 letters + 2 digits + 1-2 letters + 4 digits)
    const regex = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/
    return regex.test(vehicleNo.replace(/\s/g, ""))
  },

  /**
   * Format vehicle number
   */
  formatVehicleNumber(vehicleNo: string): string {
    return vehicleNo.replace(/\s/g, "").toUpperCase()
  },
}


