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
import type { ICustomer } from "@/types"
import { searchCustomers } from "@/app/customers/actions"

interface AsyncCustomerSelectProps {
  readonly value: ICustomer | null
  readonly onValueChange: (customer: ICustomer | null) => void
  readonly disabled?: boolean
  readonly initialCustomers?: readonly ICustomer[]
}

export function AsyncCustomerSelect({
  value,
  onValueChange,
  disabled,
  initialCustomers = [],
}: AsyncCustomerSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [customers, setCustomers] = React.useState<ICustomer[]>([...initialCustomers])
  const [isSearching, setIsSearching] = React.useState(false)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (!open) {
      setSearchQuery("")
      return
    }
    if (customers.length === 0) {
      setIsSearching(true)
      searchCustomers("", 30).then((results) => {
        setCustomers(results)
        setIsSearching(false)
      })
    }
  }, [open, customers.length])

  const handleSearch = React.useCallback((query: string) => {
    setSearchQuery(query)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      const results = await searchCustomers(query, 30)
      setCustomers(results)
      setIsSearching(false)
    }, 300)
  }, [])

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
            {value ? (
              <span className="flex items-center gap-2">
                <span className="font-medium">{value.name}</span>
                {value.contactNo && (
                  <span className="text-xs text-muted-foreground">
                    ({value.contactNo})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">Select customer...</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-100 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name, phone, GST..."
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
                <CommandEmpty>No customers found.</CommandEmpty>
                <CommandGroup>
                  {customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      onSelect={() => {
                        onValueChange(customer.id === value?.id ? null : customer)
                        setOpen(false)
                        setSearchQuery("")
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value?.id === customer.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium truncate">{customer.name}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {customer.contactNo && <span>{customer.contactNo}</span>}
                          {customer.gstinNo && <span>• {customer.gstinNo}</span>}
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
