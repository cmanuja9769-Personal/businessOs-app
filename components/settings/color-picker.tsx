"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

const colorPresets = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Green", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Gray", value: "#6b7280" },
  { name: "Black", value: "#000000" },
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="space-y-3">
      <Label>Template Color</Label>
      <p className="text-sm text-muted-foreground">Select primary color for invoice branding</p>
      
      <div className="flex flex-wrap gap-2">
        {colorPresets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={`h-10 w-10 rounded-md border-2 transition-all ${
              value === preset.value ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
            }`}
            style={{ backgroundColor: preset.value }}
            onClick={() => onChange(preset.value)}
            title={preset.name}
          />
        ))}
        
        <div className="relative">
          <Input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-10 p-0 border-2 cursor-pointer"
            title="Custom color"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="h-8 w-16 rounded border" style={{ backgroundColor: value }} />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#6366f1"
          className="w-28 font-mono text-sm"
          pattern="^#[0-9A-Fa-f]{6}$"
        />
      </div>
      
      <input type="hidden" name="templateColor" value={value} />
    </div>
  )
}
