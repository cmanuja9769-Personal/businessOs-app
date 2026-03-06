interface ColumnMapping<T> {
  readonly key: keyof T | string
  readonly header: string
  readonly format?: (value: unknown, row: T) => string
}

function getNestedValue<T>(obj: T, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc !== null && acc !== undefined && typeof acc === "object") {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj)
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportToCSV<T extends Record<string, unknown>>(
  data: readonly T[],
  filename: string,
  columns: readonly ColumnMapping<T>[],
  options?: {
    readonly titleRows?: readonly string[]
    readonly totalsRow?: Record<string, unknown>
  },
): void {
  const lines: string[] = []

  if (options?.titleRows) {
    for (const row of options.titleRows) {
      lines.push(row)
    }
    lines.push("")
  }

  lines.push(columns.map((col) => escapeCsvCell(col.header)).join(","))

  for (const row of data) {
    const cells = columns.map((col) => {
      const raw = getNestedValue(row, col.key as string)
      const formatted = col.format ? col.format(raw, row) : raw
      return escapeCsvCell(formatted)
    })
    lines.push(cells.join(","))
  }

  if (options?.totalsRow) {
    const cells = columns.map((col) => {
      const val = options.totalsRow![col.key as string]
      return escapeCsvCell(val !== undefined ? val : "")
    })
    lines.push(cells.join(","))
  }

  const csvContent = lines.join("\n")
  const bom = "\uFEFF"
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

interface SerializableColumn {
  key: string
  header: string
  width: string
  align?: "left" | "center" | "right"
  bold?: boolean
  format?: (value: unknown, row: Record<string, unknown>) => string
}

interface SerializableGroup {
  label: string
  rows: Record<string, unknown>[]
  subtotals?: Record<string, unknown>
}

function preFormatRow(
  row: Record<string, unknown>,
  columns: readonly SerializableColumn[],
): Record<string, unknown> {
  const formatted: Record<string, unknown> = {}
  for (const col of columns) {
    const raw = row[col.key]
    formatted[col.key] = col.format ? col.format(raw, row) : raw
  }
  return formatted
}

function preFormatTotals(
  totals: Record<string, unknown>,
  columns: readonly SerializableColumn[],
): Record<string, unknown> {
  const formatted: Record<string, unknown> = {}
  for (const col of columns) {
    if (totals[col.key] !== undefined) {
      formatted[col.key] = col.format ? col.format(totals[col.key], totals) : totals[col.key]
    }
  }
  return formatted
}

export async function downloadReportPDF(
  element: React.ReactElement,
  filename: string,
): Promise<void> {
  const props = element.props as {
    title?: string
    subtitle?: string
    dateRange?: string
    columns?: readonly SerializableColumn[]
    data?: readonly Record<string, unknown>[]
    groups?: readonly SerializableGroup[]
    totals?: Record<string, unknown>
    businessName?: string
    highlightRow?: (row: Record<string, unknown>) => "red" | "green" | null
    orientation?: "portrait" | "landscape"
  }

  const columns = props.columns ?? []
  const cleanColumns = columns.map(({ format: _fmt, ...rest }) => rest)

  const rawData = [...(props.data ?? [])]
  const formattedData = rawData.map((row, i) => ({ ...preFormatRow(row, columns), __idx: i }))
  const highlights = props.highlightRow
    ? rawData.map((row) => props.highlightRow!(row))
    : undefined

  let formattedGroups: SerializableGroup[] | undefined
  let groupHighlights: ("red" | "green" | null)[][] | undefined

  if (props.groups && props.groups.length > 0) {
    formattedGroups = props.groups.map((group, gi) => {
      const rows = group.rows.map((row, ri) => ({
        ...preFormatRow(row, columns),
        __idx: gi * 10000 + ri,
      }))
      return {
        label: group.label,
        rows,
        subtotals: group.subtotals ? preFormatTotals(group.subtotals, columns) : undefined,
      }
    })

    if (props.highlightRow) {
      groupHighlights = props.groups.map((group) =>
        group.rows.map((row) => props.highlightRow!(row)),
      )
    }
  }

  const formattedTotals = props.totals ? preFormatTotals(props.totals, columns) : undefined

  const body = {
    title: props.title ?? "Report",
    subtitle: props.subtitle,
    dateRange: props.dateRange,
    columns: cleanColumns,
    data: formattedData,
    groups: formattedGroups,
    totals: formattedTotals,
    businessName: props.businessName,
    orientation: props.orientation,
    filename: filename.replace(/\.pdf$/i, ""),
    highlights,
    groupHighlights,
  }

  const response = await fetch("/api/reports/export-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.error ?? `PDF generation failed (${response.status})`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 0))
  })
}
