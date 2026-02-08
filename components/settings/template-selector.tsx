"use client"

import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Check } from "lucide-react"

type TemplateValue = "classic" | "modern" | "minimal"

interface TemplateOption {
  value: TemplateValue
  label: string
  description: string
  preview: string
}

const templates: TemplateOption[] = [
  {
    value: "classic",
    label: "Classic",
    description: "Traditional invoice with clean layout",
    preview: "bg-gradient-to-br from-blue-50 to-indigo-50",
  },
  {
    value: "modern",
    label: "Modern",
    description: "Bold header with contemporary design",
    preview: "bg-gradient-to-br from-purple-50 to-pink-50",
  },
  {
    value: "minimal",
    label: "Minimal",
    description: "Simple and elegant design",
    preview: "bg-gradient-to-br from-slate-50 to-gray-50",
  },
]

interface TemplateSelectorProps {
  value: "classic" | "modern" | "minimal"
  onChange: (value: "classic" | "modern" | "minimal") => void
}

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  return (
    <div className="space-y-3">
      <Label>Invoice Template</Label>
      <p className="text-sm text-muted-foreground">Choose your preferred invoice design</p>
      
      <div className="grid grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card
            key={template.value}
            className={`relative cursor-pointer transition-all hover:border-primary ${
              value === template.value ? "border-primary ring-2 ring-primary ring-offset-2" : ""
            }`}
            onClick={() => onChange(template.value)}
          >
            <div className="p-4 space-y-3">
              <div className={`h-24 rounded-md ${template.preview} border`}>
                {value === template.value && (
                  <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium">{template.label}</p>
                <p className="text-xs text-muted-foreground">{template.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      <input type="hidden" name="invoiceTemplate" value={value} />
    </div>
  )
}
