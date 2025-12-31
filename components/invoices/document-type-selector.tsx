"use client"

import { useState } from "react"
import { DOCUMENT_TYPE_CONFIG, DocumentType } from "@/types"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Receipt, Truck, FileCheck, FileSignature, FileX, FileWarning, ChevronDown, ChevronUp } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface DocumentTypeSelectorProps {
  value: DocumentType
  onChange: (value: DocumentType) => void
  disabled?: boolean
}

const DOCUMENT_ICONS: Record<DocumentType, React.ReactNode> = {
  invoice: <FileText className="w-5 h-5" />,
  sales_order: <FileSignature className="w-5 h-5" />,
  quotation: <Receipt className="w-5 h-5" />,
  proforma: <FileText className="w-5 h-5" />,
  delivery_challan: <Truck className="w-5 h-5" />,
  credit_note: <FileX className="w-5 h-5" />,
  debit_note: <FileWarning className="w-5 h-5" />,
}

export function DocumentTypeSelector({ value, onChange, disabled }: DocumentTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(true)
  const config = DOCUMENT_TYPE_CONFIG[value]

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Document Type</Label>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              {isOpen ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Change Type
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Selected Type Display (when collapsed) */}
        {!isOpen && (
          <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="text-primary">
              {DOCUMENT_ICONS[value]}
            </div>
            <div>
              <p className="font-semibold text-sm">{config.label}</p>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>
          </div>
        )}

        <CollapsibleContent className="space-y-3">
          <RadioGroup value={value} onValueChange={(v) => {
            onChange(v as DocumentType)
            setIsOpen(false) // Auto-collapse after selection
          }} disabled={disabled}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.keys(DOCUMENT_TYPE_CONFIG) as DocumentType[]).map((docType) => {
                const typeConfig = DOCUMENT_TYPE_CONFIG[docType]
                const isSelected = value === docType

                return (
                  <Card
                    key={docType}
                    className={`cursor-pointer transition-all hover:border-primary ${
                      isSelected ? "border-primary bg-primary/5" : ""
                    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => {
                      if (!disabled) {
                        onChange(docType)
                        setIsOpen(false) // Auto-collapse on click
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value={docType} id={docType} className="mt-0.5" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <div className={isSelected ? "text-primary" : "text-muted-foreground"}>
                              {DOCUMENT_ICONS[docType]}
                            </div>
                            <Label htmlFor={docType} className="cursor-pointer font-semibold text-sm">
                              {typeConfig.label}
                            </Label>
                          </div>
                          <p className="text-xs text-muted-foreground leading-tight">{typeConfig.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </RadioGroup>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
