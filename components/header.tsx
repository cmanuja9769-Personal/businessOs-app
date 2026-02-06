"use client"

import { Bell, Search, Package, Users, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { globalSearch } from "@/app/actions"
import Link from "next/link"
import { UserMenu } from "@/components/auth/user-menu"
import { OrganizationSwitcher } from "@/components/auth/organization-switcher"

type SearchResults = {
  customers: Array<{ id: string; name: string; contactNo: string; email: string | null }>
  items: Array<{ id: string; name: string; itemCode: string | null; hsnCode: string | null; salePrice: number }>
  invoices: Array<{ id: string; invoiceNo: string; totalAmount: number; createdAt: string; customerName: string }>
}

export function Header() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<SearchResults>({ customers: [], items: [], invoices: [] })
  const searchRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true)
        const searchResults = await globalSearch(searchQuery)
        setResults(searchResults)
        setShowResults(true)
        setIsSearching(false)
      } else {
        setShowResults(false)
        setResults({ customers: [], items: [], invoices: [] })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleResultClick = () => {
    setSearchQuery("")
    setShowResults(false)
  }

  const totalResults = results.customers.length + results.items.length + results.invoices.length

  return (
    <header className="bg-background border-b border-border">
      <div className="flex items-center justify-between px-4 lg:px-6 py-2 gap-3 sm:gap-4">
        {/* Organization Switcher */}
        <div className="flex-shrink-0 hidden sm:block">
          <OrganizationSwitcher />
        </div>

        {/* Search - Responsive search */}
        <div className="flex-1 relative max-w-lg" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full pl-9 pr-3 bg-muted/50 text-sm sm:text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin flex-shrink-0" />
            )}
          </div>

          {showResults && searchQuery.length >= 2 && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg max-h-96 overflow-auto z-50">
              {totalResults === 0 && !isSearching && (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No results found for "{searchQuery}"
                </div>
              )}

              {results.customers.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 flex-shrink-0" />
                    Customers
                  </div>
                  {results.customers.map((customer) => (
                    <Link
                      key={customer.id}
                      href={`/customers/${customer.id}`}
                      onClick={handleResultClick}
                      className="block px-3 py-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="font-medium text-sm truncate">{customer.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{customer.contactNo}</div>
                    </Link>
                  ))}
                </div>
              )}

              {results.items.length > 0 && (
                <div className="p-2 border-t">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 flex-shrink-0" />
                    Items
                  </div>
                  {results.items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/items/${item.id}`}
                      onClick={handleResultClick}
                      className="block px-3 py-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm truncate">{item.name}</div>
                        <div className="text-sm font-semibold flex-shrink-0">₹{item.salePrice.toFixed(2)}</div>
                      </div>
                      {item.itemCode && (
                        <div className="text-xs text-muted-foreground font-mono truncate">{item.itemCode}</div>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {results.invoices.length > 0 && (
                <div className="p-2 border-t">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                    Invoices
                  </div>
                  {results.invoices.map((invoice) => (
                    <Link
                      key={invoice.id}
                      href={`/invoices/${invoice.id}`}
                      onClick={handleResultClick}
                      className="block px-3 py-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm font-mono truncate">{invoice.invoiceNo}</div>
                        <div className="text-sm font-semibold flex-shrink-0">₹{invoice.totalAmount.toFixed(2)}</div>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{invoice.customerName}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" className="relative flex-shrink-0">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
          </Button>

          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-border">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
