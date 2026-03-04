"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { IItem } from "@/types"
import type { LightweightItem } from "@/app/items/lightweight-actions"
import { searchItemsForInvoice } from "@/app/items/lightweight-actions"

type SelectableItem = IItem | LightweightItem

interface AsyncItemSelectProps {
  readonly items: SelectableItem[]
  readonly value?: string
  readonly onValueChange: (value: string) => void
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly onItemsFetched?: (items: SelectableItem[]) => void
}

export function AsyncItemSelect({
  items: externalItems,
  value,
  onValueChange,
  placeholder = "Select item...",
  disabled,
  onItemsFetched,
}: AsyncItemSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<SelectableItem[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedItem = externalItems.find((item) => item.id === value)
    || searchResults.find((item) => item.id === value)

  const displayItems = hasSearched ? searchResults : externalItems

  React.useEffect(() => {
    if (!open) {
      setSearchQuery("")
      setHasSearched(false)
      return
    }
    if (externalItems.length === 0 && !hasSearched) {
      setIsSearching(true)
      searchItemsForInvoice("", 30).then((results) => {
        setSearchResults(results)
        setHasSearched(true)
        setIsSearching(false)
        onItemsFetched?.(results)
      })
    }
  }, [open, externalItems.length, hasSearched, onItemsFetched])

  const handleSearch = React.useCallback(
    (query: string) => {
      setSearchQuery(query)
      if (debounceRef.current) clearTimeout(debounceRef.current)

      debounceRef.current = setTimeout(async () => {
        setIsSearching(true)
        const results = await searchItemsForInvoice(query, 50)
        setSearchResults(results)
        setHasSearched(true)
        setIsSearching(false)
        onItemsFetched?.(results)
      }, 300)
    },
    [onItemsFetched]
  )

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedItem ? (
              <span className="flex items-center gap-2">
                <span className="font-medium">{selectedItem.name}</span>
                {selectedItem.itemCode && (
                  <span className="text-xs text-muted-foreground">
                    ({selectedItem.itemCode})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-100 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search items by name, code, HSN, barcode..."
            value={searchQuery}
            onValueChange={handleSearch}
          />
          <CommandList>
            {isSearching ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
              </div>
            ) : (
              <>
                <CommandEmpty>No items found.</CommandEmpty>
                <CommandGroup>
                  {displayItems.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => {
                        onValueChange(item.id === value ? "" : item.id)
                        setOpen(false)
                        setSearchQuery("")
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === item.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{item.name}</span>
                          {item.itemCode && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {item.itemCode}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {item.category && <span>{item.category}</span>}
                          {item.hsnCode && <span>• HSN: {item.hsnCode}</span>}
                          <span>
                            • Stock: {item.stock} {item.unit}
                          </span>
                          <span>• ₹{item.salePrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
