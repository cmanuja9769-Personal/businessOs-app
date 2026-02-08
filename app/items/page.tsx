import { getItems } from "./actions"
import { ItemsContent } from "@/components/items/items-content"
import { getWarehouses } from "@/app/godowns/actions"
import { getLatestPrintLogsForItems } from "@/app/barcode-logs/actions"

type ItemsSearchParams = {
  q?: string | string[]
  unit?: string | string[]
  category?: string | string[]
  godown?: string | string[]
  stock?: string | string[]
  sort?: string | string[]
  dir?: string | string[]
}

function spValue(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "")
}

export default async function ItemsPage({ searchParams }: { searchParams?: Promise<ItemsSearchParams> }) {
  const items = await getItems()
  const godowns = await getWarehouses()
  const printLogs = await getLatestPrintLogsForItems(items.map((i) => i.id))
  const params = await searchParams

  const q = spValue(params?.q).trim()
  const unit = spValue(params?.unit).trim().toUpperCase()
  const category = spValue(params?.category).trim()
  const godown = spValue(params?.godown).trim()
  const stock = spValue(params?.stock).trim().toLowerCase()
  const sort = spValue(params?.sort).trim().toLowerCase() || "updated"
  const dir = (spValue(params?.dir).trim().toLowerCase() || "desc") as "asc" | "desc"

  return (
    <ItemsContent
      items={items}
      godowns={godowns}
      printLogs={printLogs}
      initialFilters={{ q, unit, category, godown, stock, sort, dir }}
    />
  )
}
