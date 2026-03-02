"use client"

import { useState, useMemo, useCallback } from "react"
import type { IInvoice, DocumentType } from "@/types"
import { DOCUMENT_TYPE_CONFIG } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { PageHeader } from "@/components/ui/page-header"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { DataPagination } from "@/components/ui/data-pagination"
import { BulkDeleteButton } from "@/components/ui/bulk-delete-button"
import { InvoiceDesktopRow } from "@/components/invoices/invoice-desktop-row"
import { InvoiceMobileCard } from "@/components/invoices/invoice-mobile-card"
import { usePagination } from "@/hooks/use-pagination"
import { bulkDeleteInvoices } from "@/app/invoices/actions"
import { PAGINATION } from "@/lib/design-tokens"
import { FileText, Plus } from "lucide-react"
import Link from "next/link"
import type { DocumentStatus } from "@/components/ui/status-badge"

type InvoicesFilterState = {
  q: string
  documentType: string
  status: string
}

interface InvoicesContentProps {
  readonly invoices: IInvoice[]
}

function matchesSearch(invoice: IInvoice, query: string): boolean {
  if (!query) return true
  const lc = query.toLowerCase()
  const fields = [
    invoice.invoiceNo,
    invoice.customerName,
    invoice.customerPhone ?? "",
    invoice.customerGst ?? "",
  ]
  return fields.some((f) => f.toLowerCase().includes(lc))
}

function filterInvoices(invoices: IInvoice[], filters: InvoicesFilterState): IInvoice[] {
  return invoices.filter((inv) => {
    if (!matchesSearch(inv, filters.q)) return false
    if (filters.documentType && filters.documentType !== "all" && inv.documentType !== filters.documentType) return false
    if (filters.status && filters.status !== "all" && inv.status !== filters.status) return false
    return true
  })
}

export function InvoicesContent({ invoices }: InvoicesContentProps) {
  const [filters, setFilters] = useState<InvoicesFilterState>({ q: "", documentType: "all", status: "all" })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const filteredInvoices = useMemo(
    () => filterInvoices(invoices, filters),
    [invoices, filters],
  )

  const documentTypes = useMemo(
    () => Array.from(new Set(invoices.map((i) => i.documentType))).sort(),
    [invoices],
  )

  const statuses = useMemo(
    () => Array.from(new Set(invoices.map((i) => i.status))).sort(),
    [invoices],
  )

  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    setCurrentPage,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious,
    visiblePages,
  } = usePagination({
    totalItems: filteredInvoices.length,
    itemsPerPage: PAGINATION.defaultPageSize,
  })

  const paginatedInvoices = useMemo(
    () => filteredInvoices.slice(startIndex, endIndex),
    [filteredInvoices, startIndex, endIndex],
  )

  const allSelected = paginatedInvoices.length > 0 && selectedIds.size === paginatedInvoices.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < paginatedInvoices.length

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === paginatedInvoices.length) return new Set()
      return new Set(paginatedInvoices.map((i) => i.id))
    })
  }, [paginatedInvoices])

  const handleBulkDeleteComplete = useCallback(() => {
    setSelectedIds(new Set())
    window.location.reload()
  }, [])

  const updateFilters = useCallback((patch: Partial<InvoicesFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
    setSelectedIds(new Set())
  }, [])

  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 h-full flex flex-col overflow-hidden">
      <PageHeader
        title="Invoices"
        description="Manage and track all your sales invoices"
        actions={
          <Link href="/invoices/new">
            <Button className="w-full sm:w-auto gap-2 h-9 text-sm">
              <Plus className="w-4 h-4" />
              New Invoice
            </Button>
          </Link>
        }
      />

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="px-4 shrink-0">
          <div className="flex flex-col gap-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">All Invoices</span>
              <span className="sm:hidden">Invoices</span>
              <span className="text-muted-foreground font-normal" aria-live="polite" aria-atomic="true">
                ({filteredInvoices.length})
              </span>
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <SearchInput
                  value={filters.q}
                  onChange={(value) => updateFilters({ q: value })}
                  placeholder="Search invoices..."
                />
              </div>
              <div className="flex gap-2">
                <Select value={filters.documentType} onValueChange={(v) => updateFilters({ documentType: v })}>
                  <SelectTrigger className="w-full sm:w-[10rem] text-xs h-8" title="Filter by type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {documentTypes.map((dt) => (
                      <SelectItem key={dt} value={dt}>
                        {DOCUMENT_TYPE_CONFIG[dt as DocumentType]?.label ?? dt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.status} onValueChange={(v) => updateFilters({ status: v })}>
                  <SelectTrigger className="w-full sm:w-[8rem] text-xs h-8" title="Filter by status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col overflow-hidden px-4 pb-4 pt-0">
          {filteredInvoices.length === 0 ? (
            <DataEmptyState
              icon={<FileText className="w-12 h-12" />}
              title="No invoices found"
              description="Try adjusting filters or create a new invoice"
              action={
                <Link href="/invoices/new">
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Invoice
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {selectedIds.size > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b shrink-0">
                  <span className="text-sm font-medium">
                    {selectedIds.size} {selectedIds.size === 1 ? "row" : "rows"} selected
                  </span>
                  <BulkDeleteButton
                    selectedIds={Array.from(selectedIds)}
                    entityName="invoices"
                    deleteAction={bulkDeleteInvoices}
                    onDeleteComplete={handleBulkDeleteComplete}
                  />
                </div>
              )}

              <div className="md:hidden flex-1 min-h-0 overflow-y-auto space-y-2">
                {paginatedInvoices.map((invoice) => (
                  <InvoiceMobileCard
                    key={invoice.id}
                    id={invoice.id}
                    invoiceNo={invoice.invoiceNo}
                    customerName={invoice.customerName}
                    amount={invoice.total}
                    date={new Date(invoice.invoiceDate)}
                    dueDate={new Date(invoice.dueDate)}
                    status={invoice.status as DocumentStatus}
                    documentType={invoice.documentType}
                  />
                ))}
              </div>

              <Table containerClassName="hidden md:block flex-1 min-h-0 max-h-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[2.75rem] min-w-[2.75rem] pl-4">
                      <Checkbox
                        checked={(() => {
                          if (allSelected) return true
                          if (someSelected) return "indeterminate"
                          return false
                        })()}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all rows"
                      />
                    </TableHead>
                    <TableHead className="w-[8.75rem]">Invoice #</TableHead>
                    <TableHead className="w-[5rem]">Type</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="w-[7.5rem]">Date</TableHead>
                    <TableHead className="w-[7.5rem]">Due Date</TableHead>
                    <TableHead className="w-[7.5rem] text-right">Amount</TableHead>
                    <TableHead className="w-[6.25rem] text-right">Paid</TableHead>
                    <TableHead className="w-[6.25rem] text-right">Balance</TableHead>
                    <TableHead className="w-[6.25rem]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((invoice) => (
                    <InvoiceDesktopRow
                      key={invoice.id}
                      id={invoice.id}
                      invoiceNo={invoice.invoiceNo}
                      customerName={invoice.customerName}
                      amount={invoice.total}
                      date={new Date(invoice.invoiceDate)}
                      dueDate={new Date(invoice.dueDate)}
                      status={invoice.status as DocumentStatus}
                      documentType={invoice.documentType}
                      paidAmount={invoice.paidAmount}
                      balance={invoice.balance}
                      selected={selectedIds.has(invoice.id)}
                      onSelectChange={toggleSelect}
                    />
                  ))}
                </TableBody>
              </Table>

              <DataPagination
                currentPage={currentPage}
                totalPages={totalPages}
                startIndex={startIndex}
                endIndex={endIndex}
                totalItems={filteredInvoices.length}
                visiblePages={visiblePages}
                canGoNext={canGoNext}
                canGoPrevious={canGoPrevious}
                onPageChange={setCurrentPage}
                onNextPage={goToNextPage}
                onPreviousPage={goToPreviousPage}
                itemLabel="invoices"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
