"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { IItem } from "@/types";

interface ItemSelectProps {
  items: IItem[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ItemSelect({
  items,
  value,
  onValueChange,
  placeholder = "Select item...",
  disabled,
}: ItemSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedItem = items.find((item) => item.id === value);

  // Filter items based on search query with flexible word matching
  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return items;

    // Split search query into individual words
    const searchWords = searchQuery
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);

    if (searchWords.length === 0) return items;

    return items.filter((item) => {
      // Create searchable text from all item fields
      const searchableText = [
        item.name,
        item.itemCode || "",
        item.hsnCode || "",
        item.category || "",
      ]
        .join(" ")
        .toLowerCase();

      // Check if all search words appear in the searchable text (in any order)
      const allWordsMatch = searchWords.every((word) =>
        searchableText.includes(word)
      );

      return allWordsMatch;
    });
  }, [items, searchQuery]);

  // Reset search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

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
            placeholder="Search items by name, code, HSN, or category..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No items found.</CommandEmpty>
            <CommandGroup>
              {filteredItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => {
                    onValueChange(item.id === value ? "" : item.id);
                    setOpen(false);
                    setSearchQuery("");
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
