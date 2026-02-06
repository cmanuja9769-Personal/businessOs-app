"use client"

import type { IItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Plus, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { ItemForm } from "@/components/items/item-form"
import { AddStockDialog } from "@/components/items/add-stock-dialog"
import { DeleteItemButton } from "@/components/items/delete-item-button"
import { StockBadge } from "@/components/items/stock-badge"
import { getStockStatus } from "@/lib/stock-utils"

interface ItemMobileCardProps {
  item: IItem
  godowns: Array<{ id: string; name: string }>
}

export function ItemMobileCard({ item, godowns }: ItemMobileCardProps) {
  const stockStatus = getStockStatus(item)

  return (
    <div className="p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
      {/* Item name + stock badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <Link
            href={`/items/${item.id}`}
            className="font-medium text-sm hover:text-primary hover:underline transition-colors line-clamp-2"
          >
            {item.name}
          </Link>
          {item.packagingUnit && item.perCartonQuantity && item.perCartonQuantity > 1 && (
            <span className="text-xs text-muted-foreground block">
              1 {item.packagingUnit} = {item.perCartonQuantity} {item.unit}
            </span>
          )}
        </div>
        <StockBadge status={stockStatus} className="shrink-0" />
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
        <div>
          <span className="text-muted-foreground block">Stock</span>
          <span className="font-medium flex items-center gap-1">
            {item.stock} {item.packagingUnit || "CTN"}
            {stockStatus === "low" && <AlertTriangle className="w-3 h-3 text-orange-500" />}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block">Sale</span>
          <span className="font-semibold">₹{item.salePrice.toFixed(0)}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">GST</span>
          <span>{item.gstRate}%</span>
        </div>
      </div>

      {/* Footer: metadata + actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {item.hsnCode && <span className="font-mono">{item.hsnCode}</span>}
          <Badge variant="outline" className="text-[0.625rem]">{item.unit}</Badge>
        </div>
        <div className="flex items-center gap-0.5">
          <AddStockDialog
            item={item}
            godowns={godowns}
            trigger={
              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            }
          />
          <ItemForm
            item={item}
            godowns={godowns}
            trigger={
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Edit className="w-3.5 h-3.5" />
              </Button>
            }
          />
          <DeleteItemButton itemId={item.id} />
        </div>
      </div>
    </div>
  )
}
