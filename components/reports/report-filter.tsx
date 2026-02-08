"use client"

import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Filter, ChevronDown } from "lucide-react"
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns"
import { cn } from "@/lib/utils"

type DatePreset = {
  readonly label: string
  readonly from: string
  readonly to: string
}

function getDatePresets(): readonly DatePreset[] {
  const now = new Date()
  const fy = now.getMonth() >= 3
    ? new Date(now.getFullYear(), 3, 1)
    : new Date(now.getFullYear() - 1, 3, 1)
  const fyEnd = new Date(fy.getFullYear() + 1, 2, 31)
  const lastMonth = subMonths(now, 1)

  return [
    { label: "This Month", from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") },
    { label: "Last Month", from: format(startOfMonth(lastMonth), "yyyy-MM-dd"), to: format(endOfMonth(lastMonth), "yyyy-MM-dd") },
    { label: "This FY", from: format(fy, "yyyy-MM-dd"), to: format(fyEnd, "yyyy-MM-dd") },
    { label: "Last FY", from: format(new Date(fy.getFullYear() - 1, 3, 1), "yyyy-MM-dd"), to: format(new Date(fy.getFullYear(), 2, 31), "yyyy-MM-dd") },
    { label: "This Year", from: format(startOfYear(now), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") },
  ] as const
}

export interface ReportFilters {
  dateFrom: string
  dateTo: string
  search: string
  warehouseIds: string[]
  categories: string[]
  stockStatus: string
  paymentStatus: string
  partyType: string
  daysOverdue: string
  viewMode: string
}

interface MultiSelectOption {
  readonly value: string
  readonly label: string
}

interface ReportFilterField {
  readonly type: "date-range" | "search" | "select" | "multi-select"
  readonly key: keyof ReportFilters
  readonly label: string
  readonly placeholder?: string
  readonly options?: readonly MultiSelectOption[]
}

interface ReportFilterProps {
  readonly fields: readonly ReportFilterField[]
  readonly filters: ReportFilters
  readonly onFiltersChange: (filters: ReportFilters) => void
  readonly onApply: () => void
  readonly loading?: boolean
  readonly className?: string
}

export function getDefaultFilters(overrides?: Partial<ReportFilters>): ReportFilters {
  const now = new Date()
  return {
    dateFrom: format(startOfMonth(now), "yyyy-MM-dd"),
    dateTo: format(endOfMonth(now), "yyyy-MM-dd"),
    search: "",
    warehouseIds: [],
    categories: [],
    stockStatus: "all",
    paymentStatus: "all",
    partyType: "all",
    daysOverdue: "all",
    viewMode: "summary",
    ...overrides,
  }
}

function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
}: {
  readonly options: readonly MultiSelectOption[]
  readonly selected: string[]
  readonly onChange: (values: string[]) => void
  readonly placeholder: string
}) {
  const [open, setOpen] = useState(false)

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 justify-between min-w-[10rem] font-normal">
          {selected.length > 0 ? (
            <span className="flex items-center gap-1 truncate">
              {selected.length} selected
              <Badge variant="secondary" className="ml-1 text-xs px-1 h-5">{selected.length}</Badge>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2" align="start">
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={cn(
                "w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors flex items-center gap-2",
                selected.includes(opt.value) && "bg-accent font-medium"
              )}
            >
              <div className={cn(
                "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
                selected.includes(opt.value) ? "bg-primary border-primary" : "border-input"
              )}>
                {selected.includes(opt.value) && (
                  <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-1 h-7 text-xs"
            onClick={() => onChange([])}
          >
            Clear all
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function ReportFilter({
  fields,
  filters,
  onFiltersChange,
  onApply,
  loading,
  className,
}: ReportFilterProps) {
  const presets = getDatePresets()

  const update = useCallback(
    (key: keyof ReportFilters, value: string | string[]) => {
      onFiltersChange({ ...filters, [key]: value })
    },
    [filters, onFiltersChange]
  )

  const hasDateRange = fields.some((f) => f.type === "date-range")
  const activeFilters = fields.filter((f) => {
    if (f.type === "date-range") return false
    if (f.type === "search") return !!filters[f.key]
    if (f.type === "multi-select") return (filters[f.key] as string[]).length > 0
    if (f.type === "select") return filters[f.key] !== "all"
    return false
  }).length

  return (
    <Card className={className}>
      <CardContent className="pt-4 pb-3">
        <div className="flex flex-col gap-3">
          {hasDateRange && (
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label className="text-xs">From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => update("dateFrom", e.target.value)}
                  className="h-9 w-[9rem]"
                />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => update("dateTo", e.target.value)}
                  className="h-9 w-[9rem]"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {presets.map((p) => (
                  <Button
                    key={p.label}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 text-xs px-2",
                      filters.dateFrom === p.from && filters.dateTo === p.to && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => {
                      onFiltersChange({ ...filters, dateFrom: p.from, dateTo: p.to })
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2">
            {fields.filter((f) => f.type !== "date-range").map((field) => {
              if (field.type === "search") {
                return (
                  <div key={field.key} className="flex-1 min-w-[12rem]">
                    <Label className="text-xs">{field.label}</Label>
                    <Input
                      placeholder={field.placeholder}
                      value={filters[field.key] as string}
                      onChange={(e) => update(field.key, e.target.value)}
                      className="h-9"
                    />
                  </div>
                )
              }

              if (field.type === "multi-select" && field.options) {
                return (
                  <div key={field.key}>
                    <Label className="text-xs">{field.label}</Label>
                    <MultiSelectDropdown
                      options={field.options}
                      selected={filters[field.key] as string[]}
                      onChange={(v) => update(field.key, v)}
                      placeholder={field.placeholder || "All"}
                    />
                  </div>
                )
              }

              if (field.type === "select" && field.options) {
                return (
                  <div key={field.key}>
                    <Label className="text-xs">{field.label}</Label>
                    <Select value={filters[field.key] as string} onValueChange={(v) => update(field.key, v)}>
                      <SelectTrigger className="h-9 w-[9rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }

              return null
            })}

            <Button onClick={onApply} size="sm" disabled={loading} className="h-9">
              <Filter className="h-4 w-4 mr-1" />
              Apply
              {activeFilters > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1 h-5">{activeFilters}</Badge>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
