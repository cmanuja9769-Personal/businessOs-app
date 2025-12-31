/**
 * E-Invoicing Service - Frontend API for IRN generation and management
 * This service handles all e-invoice operations and integrates with backend APIs
 */

import type { EInvoiceData, IRNResponse } from "./e-invoice-utils"

export interface EInvoiceQueueJob {
  id: string
  invoiceId: string
  status: "pending" | "processing" | "success" | "failed"
  irn?: string
  qrCode?: string
  error?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * E-Invoice Service Class
 * Provides methods for IRN generation, QR code handling, and e-invoice management
 */
export class EInvoiceService {
  private baseUrl: string

  constructor(baseUrl = "/api/e-invoice") {
    this.baseUrl = baseUrl
  }

  /**
   * Generate IRN and QR code for an invoice
   * Called after invoice is created and sent status is set
   */
  async generateIRN(invoiceData: EInvoiceData): Promise<IRNResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-irn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoiceData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to generate IRN")
      }

      return await response.json()
    } catch (error) {
      console.error("[EInvoiceService] Failed to generate IRN:", error)
      throw error
    }
  }

  /**
   * Queue e-invoice generation (async processing)
   * Returns immediately with job ID for polling
   */
  async queueEInvoiceGeneration(invoiceId: string): Promise<EInvoiceQueueJob> {
    try {
      const response = await fetch(`${this.baseUrl}/queue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invoiceId }),
      })

      if (!response.ok) {
        throw new Error("Failed to queue e-invoice generation")
      }

      return await response.json()
    } catch (error) {
      console.error("[EInvoiceService] Failed to queue e-invoice:", error)
      throw error
    }
  }

  /**
   * Get the status of a queued e-invoice job
   * Poll this to check if IRN has been generated
   */
  async getJobStatus(jobId: string): Promise<EInvoiceQueueJob> {
    try {
      const response = await fetch(`${this.baseUrl}/job/${jobId}`)

      if (!response.ok) {
        throw new Error("Failed to get job status")
      }

      return await response.json()
    } catch (error) {
      console.error("[EInvoiceService] Failed to get job status:", error)
      throw error
    }
  }

  /**
   * Cancel an e-invoice (only valid within 24 hours of generation)
   */
  async cancelIRN(irn: string, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/cancel-irn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ irn, reason }),
      })

      if (!response.ok) {
        throw new Error("Failed to cancel IRN")
      }

      return await response.json()
    } catch (error) {
      console.error("[EInvoiceService] Failed to cancel IRN:", error)
      throw error
    }
  }

  /**
   * Validate GST credentials before e-invoicing
   */
  async validateGST(gstin: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/validate-gst`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gstin }),
      })

      if (!response.ok) {
        const error = await response.json()
        return { valid: false, error: error.message }
      }

      return { valid: true }
    } catch (error) {
      console.error("[EInvoiceService] Failed to validate GST:", error)
      return { valid: false, error: "Validation failed" }
    }
  }

  /**
   * Get IRN details for an invoice
   */
  async getIRNDetails(invoiceId: string): Promise<IRNResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/invoice/${invoiceId}`)

      if (!response.ok) {
        return null
      }

      return await response.json()
    } catch (error) {
      console.error("[EInvoiceService] Failed to get IRN details:", error)
      return null
    }
  }

  /**
   * Download e-invoice PDF with IRN and QR code
   */
  async downloadEInvoicePDF(invoiceId: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/download-pdf/${invoiceId}`)

      if (!response.ok) {
        throw new Error("Failed to download PDF")
      }

      return await response.blob()
    } catch (error) {
      console.error("[EInvoiceService] Failed to download PDF:", error)
      throw error
    }
  }

  /**
   * Get e-invoice filing status (GSTR-1, GSTR-3B)
   */
  async getFilingStatus(invoiceId: string): Promise<{
    status: "pending" | "filed" | "failed"
    gstr1Status?: string
    gstr3bStatus?: string
    error?: string
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/filing-status/${invoiceId}`)

      if (!response.ok) {
        throw new Error("Failed to get filing status")
      }

      return await response.json()
    } catch (error) {
      console.error("[EInvoiceService] Failed to get filing status:", error)
      throw error
    }
  }
}

// Singleton instance
export const eInvoiceService = new EInvoiceService()
