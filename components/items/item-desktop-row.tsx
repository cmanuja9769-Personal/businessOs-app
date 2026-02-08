"use client"

import type { IItem, IBarcodePrintLog } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { TableCell, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Edit, Plus, Barcode, AlertTriangle, Printer } from "lucide-react"
import Link from "next/link"
import { ItemForm } from "@/components/items/item-form"
import { AddStockDialog } from "@/components/items/add-stock-dialog"
import { DeleteItemButton } from "@/components/items/delete-item-button"
import { StockBadge } from "@/components/items/stock-badge"
import { getStockStatus } from "@/lib/stock-utils"
import { formatRelativeDate } from "@/lib/date-utils"

interface ItemDesktopRowProps {
  item: IItem
  godowns: Array<{ id: string; name: string }>
  lastPrint?: IBarcodePrintLog
  selected?: boolean
  onSelectChange?: (id: string) => void
}

export function ItemDesktopRow({ item, godowns, lastPrint, selected, onSelectChange }: ItemDesktopRowProps) {
  const stockStatus = getStockStatus(item)

  return (
    <TableRow
      data-state={selected ? "selected" : undefined}
      className={selected ? "bg-muted/50" : undefined}
    >
      {onSelectChange && (
        <TableCell className="pl-4">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelectChange(item.id)}
            aria-label={`Select ${item.name}`}
          />
        </TableCell>
      )}
      {/* Item Name */}
      <TableCell className="max-w-[11.25rem]">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="truncate">
              <Link
                href={`/items/${item.id}`}
                className="hover:text-primary hover:underline transition-colors font-medium"
              >
                {item.name}
              </Link>
              {item.packagingUnit && item.perCartonQuantity && item.perCartonQuantity > 1 && (
                <span className="text-xs text-muted-foreground block truncate">
                  1 {item.packagingUnit} = {item.perCartonQuantity} {item.unit}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium">{item.name}</p>
            {item.itemCode && <p className="text-xs text-muted-foreground">Code: {item.itemCode}</p>}
          </TooltipContent>
        </Tooltip>
      </TableCell>

      {/* HSN Code */}
      <TableCell className="max-w-[5.625rem]">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="font-mono text-xs truncate block">{item.hsnCode || "-"}</span>
          </TooltipTrigger>
          {item.hsnCode && (
            <TooltipContent side="top">
              <p>HSN: {item.hsnCode}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TableCell>

      {/* Unit */}
      <TableCell className="max-w-[3.75rem]">
        <Badge variant="outline" className="text-xs">
          {item.unit}
        </Badge>
      </TableCell>

      {/* Purchase Price */}
      <TableCell className="text-right text-xs sm:text-sm max-w-[6.25rem]">
        ₹{item.purchasePrice.toFixed(2)}
      </TableCell>

      {/* Sale Price */}
      <TableCell className="font-semibold text-right text-xs sm:text-sm max-w-[5.625rem]">
        ₹{item.salePrice.toFixed(2)}
      </TableCell>

      {/* Stock */}
      <TableCell className="text-right max-w-[5rem]">
        <div className="flex flex-col items-end">
          <div className="flex items-center justify-end gap-1">
            <span className="font-medium text-xs sm:text-sm truncate">
              {item.stock} {item.packagingUnit || "CTN"}
            </span>
            {stockStatus === "low" && (
              <AlertTriangle className="w-3 h-3 text-orange-500 flex-shrink-0" />
            )}
          </div>
          {item.perCartonQuantity && item.perCartonQuantity > 1 && (
            <span className="text-[0.625rem] text-muted-foreground truncate">
              = {(item.stock * item.perCartonQuantity).toLocaleString()} {item.unit}
            </span>
          )}
        </div>
      </TableCell>

      {/* Godown */}
      <TableCell className="max-w-[5rem]">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs truncate block">{item.godownName || "-"}</span>
          </TooltipTrigger>
          {item.godownName && (
            <TooltipContent side="top" className="max-w-xs">
              {item.warehouseStocks && item.warehouseStocks.length > 0 ? (
                <div className="space-y-1">
                  <p className="font-medium text-xs">Stock by Godown:</p>
                  {item.warehouseStocks.map((ws) => (
                    <p key={ws.warehouseId} className="text-xs">
                      {ws.warehouseName}: {ws.quantity} {item.packagingUnit || "CTN"}
                    </p>
                  ))}
                </div>
              ) : (
                <p>Godown: {item.godownName}</p>
              )}
            </TooltipContent>
          )}
        </Tooltip>
      </TableCell>

      {/* GST */}
      <TableCell className="text-right text-xs sm:text-sm max-w-[3.75rem]">
        {item.gstRate}%
      </TableCell>

      {/* Status */}
      <TableCell className="max-w-[5rem]">
        <StockBadge status={stockStatus} className="py-0.5" />
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right max-w-[8.125rem]">
        <div className="flex items-center justify-end gap-0.5">
          <AddStockDialog
            item={item}
            godowns={godowns}
            trigger={
              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50" title="Add Stock">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            }
          />
          <Link href={`/items/barcode/${item.id}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 relative ${lastPrint ? "text-green-600 hover:text-green-700" : ""}`}
                  title="Print Barcode"
                >
                  <Barcode className="w-3.5 h-3.5" />
                  {lastPrint && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500" />
                  )}
                </Button>
              </TooltipTrigger>
              {lastPrint && (
                <TooltipContent side="top" className="text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Printer className="w-3 h-3" />
                      Last printed: {formatRelativeDate(lastPrint.printedAt)}
                    </div>
                    <p>{lastPrint.labelsPrinted} labels ({lastPrint.printType})</p>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </Link>
          <ItemForm
            item={item}
            godowns={godowns}
            trigger={
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit Item">
                <Edit className="w-3.5 h-3.5" />
              </Button>
            }
          />
          <DeleteItemButton itemId={item.id} />
        </div>
      </TableCell>
    </TableRow>
  )
}
