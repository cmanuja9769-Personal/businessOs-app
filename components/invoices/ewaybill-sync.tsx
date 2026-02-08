/**
 * E-Way Bill Sync Component
 * Syncs E-Way Bills from government portal to local database
 */

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw, CheckCircle2, AlertCircle, Info } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface SyncSummary {
  total: number
  synced: number
  updated: number
  skipped: number
}

export function EWayBillSync({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncSummary | null>(null)
  const [syncDate, setSyncDate] = useState("")

  const handleSync = async () => {
    try {
      setIsSyncing(true)
      setSyncResult(null)

      // Build URL with optional date parameter
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
      const url = syncDate 
        ? `${baseUrl}/api/v1/e-waybill/sync?date=${syncDate}`
        : `${baseUrl}/api/v1/e-waybill/sync`

      console.warn('🔄 Syncing E-Way Bills from portal...')
      console.warn('📅 Date filter:', syncDate || 'None (today)')
      console.warn('🌐 Request URL:', url)

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for backend auth
      })

      console.warn('📥 Response status:', response.status)

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized. Please login again.")
        }
        if (response.status === 502) {
          throw new Error("E-Way Bill portal is unavailable. Please try again later.")
        }
        const error = await response.json()
        throw new Error(error.message || "Sync failed. Please try again.")
      }

      const result = await response.json()
      console.warn('✅ Sync result:', result)

      if (!result.success) {
        throw new Error(result.error?.message || "Sync failed")
      }

      setSyncResult(result.data.summary)

      // Show success notification
      toast.success(
        <div>
          <p className="font-medium">E-Way Bills Synced Successfully!</p>
          <p className="text-sm text-muted-foreground mt-1">
            {result.data.summary.synced} new, {result.data.summary.updated} updated
          </p>
        </div>
      )

      // Show warning if some were skipped
      if (result.data.summary.skipped > 0) {
        toast.warning(
          `${result.data.summary.skipped} E-Way Bills were skipped (no matching invoices)`
        )
      }

      // Callback to refresh parent list
      onSyncComplete?.()

    } catch (error: unknown) {
      console.error("❌ Sync failed:", error)
      toast.error(error instanceof Error ? error.message : "Failed to sync E-Way Bills")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleClearDate = () => {
    setSyncDate("")
  }

  const handleSetToday = () => {
    setSyncDate(format(new Date(), "dd/MM/yyyy"))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Sync E-Way Bills from Portal
        </CardTitle>
        <CardDescription>
          Fetch E-Way Bills from the government portal and link them to your invoices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Filter */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="syncDate">Date (Optional)</Label>
            <Input
              id="syncDate"
              type="text"
              placeholder="DD/MM/YYYY (leave empty for today)"
              value={syncDate}
              onChange={(e) => setSyncDate(e.target.value)}
              disabled={isSyncing}
            />
          </div>
          <div className="flex gap-2 items-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleSetToday}
              disabled={isSyncing}
            >
              Today
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClearDate}
              disabled={isSyncing || !syncDate}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Sync Button */}
        <Button
          onClick={handleSync}
          disabled={isSyncing}
          className="w-full"
          size="lg"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync from Portal
            </>
          )}
        </Button>

        {/* Sync Results */}
        {syncResult && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-green-900">
                <CheckCircle2 className="w-5 h-5" />
                Sync Complete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-gray-900">
                    {syncResult.total}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Total Found</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">
                    {syncResult.synced}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">New Synced</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {syncResult.updated}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Updated</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-amber-200">
                  <div className="text-2xl font-bold text-amber-600">
                    {syncResult.skipped}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Skipped</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Box */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-blue-900 space-y-1">
              <p className="font-medium">How Sync Works:</p>
              <ul className="list-disc pl-4 text-blue-800 space-y-0.5">
                <li>Fetches E-Way Bills from government portal</li>
                <li>Matches them with your invoices by invoice number</li>
                <li>Updates invoice records with E-Way Bill details</li>
                <li>Skips E-Way Bills without matching invoices</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Warning Box */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-amber-900">
              <p className="font-medium">Note:</p>
              <p className="text-amber-800">
                Sync requires valid credentials configured in backend. Contact admin if sync fails.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
