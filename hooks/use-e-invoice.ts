"use client"

/**
 * React hook for managing e-invoice operations
 * Handles generation, polling, and error handling
 */

import { useState, useCallback, useEffect } from "react"
import { eInvoiceService } from "@/lib/e-invoice-service"
import type { EInvoiceQueueJob } from "@/lib/e-invoice-service"

export function useEInvoice() {
  const [job, setJob] = useState<EInvoiceQueueJob | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)

  // Poll job status
  useEffect(() => {
    if (!job || job.status !== "processing") return

    const timer = setTimeout(async () => {
      try {
        const updated = await eInvoiceService.getJobStatus(job.id)
        setJob(updated)

        if (updated.status === "failed") {
          setError(updated.error || "Failed to generate IRN")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to check status")
      }

      setPollCount((prev) => prev + 1)
    }, 2000)

    return () => clearTimeout(timer)
  }, [job, job?.status])

  const generate = useCallback(async (invoiceId: string) => {
    setLoading(true)
    setError(null)

    try {
      const newJob = await eInvoiceService.queueEInvoiceGeneration(invoiceId)
      setJob(newJob)
      setPollCount(0)
      return newJob
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate IRN"
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const cancel = useCallback(async (irn: string, reason: string) => {
    try {
      const result = await eInvoiceService.cancelIRN(irn, reason)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel IRN"
      setError(message)
      throw err
    }
  }, [])

  return {
    job,
    loading,
    error,
    pollCount,
    generate,
    cancel,
    isSuccess: job?.status === "success",
    isProcessing: job?.status === "processing",
    isFailed: job?.status === "failed",
  }
}
