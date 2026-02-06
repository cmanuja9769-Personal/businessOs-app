import type { IItem } from "@/types"

export type StockStatus = "low" | "high" | "normal"

export function getStockStatus(
  item: Pick<IItem, "stock" | "minStock" | "maxStock">
): StockStatus {
  if (item.stock <= item.minStock) return "low"
  if (item.stock >= item.maxStock) return "high"
  return "normal"
}

export const STOCK_STATUS_LABELS: Readonly<Record<StockStatus, string>> = {
  low: "Low",
  high: "Over",
  normal: "OK",
} as const
