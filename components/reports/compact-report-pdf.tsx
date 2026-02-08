"use client"

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"
import { format } from "date-fns"

Font.register({
  family: "NotoSans",
  fonts: [
    { src: "/fonts/noto-sans-400.woff", fontWeight: 400 },
    { src: "/fonts/noto-sans-700.woff", fontWeight: 700 },
  ],
})

export interface ReportColumn {
  key: string
  header: string
  width: string
  align?: "left" | "center" | "right"
  bold?: boolean
  format?: (value: unknown, row: Record<string, unknown>) => string
}

export interface ReportGroup {
  label: string
  rows: Record<string, unknown>[]
  subtotals?: Record<string, unknown>
}

interface CompactReportPDFProps {
  readonly title: string
  readonly subtitle?: string
  readonly dateRange?: string
  readonly columns: readonly ReportColumn[]
  readonly data: readonly Record<string, unknown>[]
  readonly groups?: readonly ReportGroup[]
  readonly totals?: Record<string, unknown>
  readonly businessName?: string
  readonly highlightRow?: (row: Record<string, unknown>) => "red" | "green" | null
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 24,
    fontFamily: "NotoSans",
    fontSize: 8,
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
    paddingBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
  },
  subtitle: {
    fontSize: 8,
    color: "#6b7280",
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 3,
  },
  metaText: {
    fontSize: 7,
    color: "#9ca3af",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1f2937",
    paddingVertical: 3,
    paddingHorizontal: 4,
    marginBottom: 1,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    minHeight: 14,
  },
  tableRowAlt: {
    backgroundColor: "#f9fafb",
  },
  tableCell: {
    fontSize: 8,
    color: "#374151",
  },
  groupHeader: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    paddingVertical: 3,
    paddingHorizontal: 4,
    marginTop: 4,
    marginBottom: 1,
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
  },
  groupTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1e40af",
  },
  subtotalRow: {
    flexDirection: "row",
    backgroundColor: "#f0f9ff",
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderTopWidth: 0.5,
    borderTopColor: "#93c5fd",
  },
  subtotalCell: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#1e40af",
  },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#1f2937",
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  totalCell: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#ffffff",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#d1d5db",
    paddingTop: 4,
  },
  footerText: {
    fontSize: 6,
    color: "#9ca3af",
  },
  pageNumber: {
    fontSize: 6,
    color: "#9ca3af",
  },
  redText: {
    color: "#dc2626",
  },
  greenText: {
    color: "#16a34a",
  },
  strikethrough: {
    textDecoration: "line-through",
    opacity: 0.5,
  },
})

function getCellStyle(col: ReportColumn) {
  const base: { width: string; textAlign?: "left" | "center" | "right" } = { width: col.width }
  if (col.align === "right") base.textAlign = "right"
  if (col.align === "center") base.textAlign = "center"
  return base
}

function formatCell(col: ReportColumn, row: Record<string, unknown>): string {
  const value = row[col.key]
  if (col.format) return col.format(value, row)
  if (value === null || value === undefined) return "-"
  if (typeof value === "number") {
    if (col.key.includes("amount") || col.key.includes("value") || col.key.includes("price") || col.key.includes("total") || col.key.includes("balance") || col.key.includes("cost") || col.key.includes("debit") || col.key.includes("credit")) {
      return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return value.toLocaleString("en-IN")
  }
  return String(value)
}

function TableHeaderRow({ columns }: { columns: readonly ReportColumn[] }) {
  return (
    <View style={styles.tableHeader} fixed>
      {columns.map((col) => (
        <Text key={col.key} style={[styles.tableHeaderCell, getCellStyle(col)]}>
          {col.header}
        </Text>
      ))}
    </View>
  )
}

function DataRow({
  row,
  columns,
  index,
  highlight,
}: {
  row: Record<string, unknown>
  columns: readonly ReportColumn[]
  index: number
  highlight?: "red" | "green" | null
}) {
  return (
    <View
      style={[
        styles.tableRow,
        index % 2 === 1 ? styles.tableRowAlt : {},
      ]}
      wrap={false}
    >
      {columns.map((col) => (
        <Text
          key={col.key}
          style={[
            styles.tableCell,
            getCellStyle(col),
            col.bold ? { fontWeight: "bold" } : {},
            highlight === "red" ? styles.redText : {},
            highlight === "green" ? styles.greenText : {},
          ]}
        >
          {formatCell(col, row)}
        </Text>
      ))}
    </View>
  )
}

function TotalRow({
  totals,
  columns,
  variant,
}: {
  totals: Record<string, unknown>
  columns: readonly ReportColumn[]
  variant: "subtotal" | "total"
}) {
  const rowStyle = variant === "total" ? styles.totalRow : styles.subtotalRow
  const cellStyle = variant === "total" ? styles.totalCell : styles.subtotalCell

  return (
    <View style={rowStyle} wrap={false}>
      {columns.map((col) => (
        <Text key={col.key} style={[cellStyle, getCellStyle(col)]}>
          {totals[col.key] !== undefined ? formatCell(col, totals) : ""}
        </Text>
      ))}
    </View>
  )
}

export function CompactReportPDF({
  title,
  subtitle,
  dateRange,
  columns,
  data,
  groups,
  totals,
  businessName,
  highlightRow,
}: CompactReportPDFProps) {
  const printDate = format(new Date(), "dd/MM/yyyy HH:mm")

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {businessName || ""}
              {dateRange ? ` | ${dateRange}` : ""}
            </Text>
            <Text style={styles.metaText}>Generated: {printDate}</Text>
          </View>
        </View>

        {groups && groups.length > 0
          ? groups.map((group, gi) => (
              <View key={`g-${gi}`}>
                <View style={styles.groupHeader} wrap={false}>
                  <Text style={styles.groupTitle}>{group.label}</Text>
                </View>
                <TableHeaderRow columns={columns} />
                {group.rows.map((row, ri) => (
                  <DataRow
                    key={`g${gi}-r${ri}`}
                    row={row}
                    columns={columns}
                    index={ri}
                    highlight={highlightRow?.(row)}
                  />
                ))}
                {group.subtotals && (
                  <TotalRow totals={group.subtotals} columns={columns} variant="subtotal" />
                )}
              </View>
            ))
          : <>
              <TableHeaderRow columns={columns} />
              {data.map((row, ri) => (
                <DataRow
                  key={`r-${ri}`}
                  row={row}
                  columns={columns}
                  index={ri}
                  highlight={highlightRow?.(row)}
                />
              ))}
            </>}

        {totals && <TotalRow totals={totals} columns={columns} variant="total" />}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{title} — {businessName || "Business"}</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
