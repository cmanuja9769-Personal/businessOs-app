import { NextResponse } from "next/server"
import { createElement } from "react"
import { renderToBuffer, Font } from "@react-pdf/renderer"
import { join } from "path"
import type { CompactReportPDFProps } from "@/components/reports/compact-report-pdf"

Font.register({
  family: "NotoSans",
  fonts: [
    { src: join(process.cwd(), "public", "fonts", "noto-sans-400.woff"), fontWeight: 400 },
    { src: join(process.cwd(), "public", "fonts", "noto-sans-700.woff"), fontWeight: 700 },
  ],
})

type HighlightColor = "red" | "green" | null

interface PDFColumn {
  key: string
  header: string
  width: string
  align?: "left" | "center" | "right"
  bold?: boolean
}

interface PDFGroup {
  label: string
  rows: Record<string, unknown>[]
  subtotals?: Record<string, unknown>
}

interface PDFRequestBody {
  title: string
  subtitle?: string
  dateRange?: string
  columns: PDFColumn[]
  data: Record<string, unknown>[]
  groups?: PDFGroup[]
  totals?: Record<string, unknown>
  businessName?: string
  orientation?: "portrait" | "landscape"
  filename?: string
  highlights?: HighlightColor[]
  groupHighlights?: HighlightColor[][]
}

function buildGroupHighlightFn(
  groups: PDFGroup[],
  groupHighlightMap: HighlightColor[][],
): (row: Record<string, unknown>) => HighlightColor {
  const flat: HighlightColor[] = []
  for (let gi = 0; gi < groups.length; gi++) {
    for (let ri = 0; ri < groups[gi].rows.length; ri++) {
      flat.push(groupHighlightMap[gi]?.[ri] ?? null)
    }
  }
  return (row: Record<string, unknown>) => {
    const idx = Number(row.__idx)
    return Number.isFinite(idx) ? (flat[idx] ?? null) : null
  }
}

function buildFlatHighlightFn(
  highlightMap: HighlightColor[],
): (row: Record<string, unknown>) => HighlightColor {
  return (row: Record<string, unknown>) => {
    const idx = Number(row.__idx)
    return Number.isFinite(idx) ? (highlightMap[idx] ?? null) : null
  }
}

async function loadComponent() {
  const mod = await import("@/components/reports/compact-report-pdf")
  return mod.CompactReportPDF
}

export async function POST(request: Request) {
  try {
    const body: PDFRequestBody = await request.json()
    const CompactReportPDF = await loadComponent()

    let highlightRow: CompactReportPDFProps["highlightRow"]
    if (body.groups?.length && body.groupHighlights) {
      highlightRow = buildGroupHighlightFn(body.groups, body.groupHighlights)
    } else if (body.highlights) {
      highlightRow = buildFlatHighlightFn(body.highlights)
    }

    const props: CompactReportPDFProps = {
      title: body.title,
      subtitle: body.subtitle,
      dateRange: body.dateRange,
      columns: body.columns,
      data: body.data ?? [],
      groups: body.groups,
      totals: body.totals,
      businessName: body.businessName,
      orientation: body.orientation,
      highlightRow,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = createElement(CompactReportPDF, props as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any)
    const safeName = (body.filename ?? "report").replace(/[^a-zA-Z0-9_-]/g, "_")

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Server-side PDF generation failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PDF generation failed" },
      { status: 500 },
    )
  }
}
