/**
 * Barcode Helper Component
 * Provides barcode format suggestions and validation feedback
 */

import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon, CheckCircle2, AlertCircle } from "lucide-react"
import { validateBarcode } from "@/lib/barcode-generator"

interface BarcodeHelperProps {
  value?: string
  showFormatInfo?: boolean
}

export function BarcodeHelper({ value, showFormatInfo = false }: BarcodeHelperProps) {
  const validation = value ? validateBarcode(value) : null

  return (
    <div className="space-y-2">
      {/* Validation Feedback */}
      {value && validation && (
        <div className="flex items-center gap-2 text-sm">
          {validation.isValid ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-green-600">
                Valid {validation.format} barcode
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-600">{validation.error}</span>
            </>
          )}
        </div>
      )}

      {/* Format Information */}
      {showFormatInfo && (
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription className="text-xs space-y-1">
            <p className="font-semibold">Supported Barcode Formats:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li><strong>EAN-13:</strong> 13 digits (e.g., 8901234567890)</li>
              <li><strong>EAN-8:</strong> 8 digits (e.g., 12345678)</li>
              <li><strong>UPC-A:</strong> 12 digits (e.g., 123456789012)</li>
              <li><strong>Custom:</strong> Alphanumeric (e.g., BAR-0001, ITEM2025)</li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              Leave empty to add barcode later or use auto-generation.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

interface BarcodeFormatBadgeProps {
  barcode: string
}

export function BarcodeFormatBadge({ barcode }: BarcodeFormatBadgeProps) {
  if (!barcode || barcode.trim() === '') return null
  
  const validation = validateBarcode(barcode)
  
  if (!validation.isValid) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
        Invalid
      </span>
    )
  }

  const colorMap: Record<string, string> = {
    'EAN-13': 'bg-blue-100 text-blue-800',
    'EAN-8': 'bg-green-100 text-green-800',
    'UPC-A': 'bg-purple-100 text-purple-800',
    'Custom': 'bg-gray-100 text-gray-800',
  }

  const color = colorMap[validation.format || 'Custom'] || 'bg-gray-100 text-gray-800'

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {validation.format}
    </span>
  )
}

/**
 * Barcode Examples Component
 * Shows example formats for reference
 */
export function BarcodeExamples() {
  const examples = [
    { format: 'EAN-13', example: '8901234567890', description: 'Retail products (13 digits)' },
    { format: 'EAN-8', example: '12345678', description: 'Small products (8 digits)' },
    { format: 'UPC-A', example: '123456789012', description: 'North America (12 digits)' },
    { format: 'Sequential', example: 'BAR000001', description: 'Custom sequential' },
    { format: 'SKU-based', example: 'ITEM-2025-001', description: 'Custom format' },
  ]

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <InfoIcon className="h-4 w-4" />
        Barcode Format Examples
      </h4>
      <div className="space-y-2">
        {examples.map((ex) => (
          <div key={ex.format} className="flex items-start gap-2 text-xs">
            <div className="min-w-[100px] font-medium text-muted-foreground">
              {ex.format}:
            </div>
            <div className="flex-1">
              <code className="bg-muted px-2 py-0.5 rounded">{ex.example}</code>
              <span className="ml-2 text-muted-foreground">- {ex.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
