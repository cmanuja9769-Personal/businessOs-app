"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { DataPagination } from "@/components/ui/data-pagination"
import { usePagination } from "@/hooks/use-pagination"
import {
  ArrowLeft,
  Barcode,
  Search,
  Calendar,
  Printer,
  Package,
  Hash,
  Loader2,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { formatRelativeDate } from "@/lib/date-utils"
import type { IBarcodePrintLog } from "@/types"
import {
  getBarcodePrintLogs,
  deleteBarcodePrintLog,
  deleteBarcodePrintLogs,
} from "@/app/barcode-logs/actions"
import { toast } from "sonner"

const PAGE_SIZE = 25

export default function BarcodeLogsPage() {
  const [logs, setLogs] = useState<IBarcodePrintLog[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dateFrom, setDateFrom] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  )
  const [dateTo, setDateTo] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  )
  const [printTypeFilter, setPrintTypeFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchTerm])

  const pagination = usePagination({
    totalItems: totalCount,
    itemsPerPage: PAGE_SIZE,
    initialPage: 1,
  })

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getBarcodePrintLogs({
        search: debouncedSearch || undefined,
        dateFrom,
        dateTo,
        printType: printTypeFilter,
        page: pagination.currentPage,
        pageSize: PAGE_SIZE,
      })
      setLogs(result.data)
      setTotalCount(result.count)
      setSelectedIds(new Set())
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, dateFrom, dateTo, printTypeFilter, pagination.currentPage])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handlePageChange = (newPage: number) => {
    pagination.setCurrentPage(newPage)
  }

  const handleFilter = () => {
    pagination.resetToFirstPage()
  }

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === logs.length) return new Set()
      return new Set(logs.map((l) => l.id))
    })
  }, [logs])

  const handleDeleteSelected = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    setDeleting(true)
    setLogs((prev) => prev.filter((l) => !selectedIds.has(l.id)))
    setTotalCount((prev) => Math.max(0, prev - ids.length))
    setSelectedIds(new Set())

    try {
      const result = ids.length === 1
        ? await deleteBarcodePrintLog(ids[0])
        : await deleteBarcodePrintLogs(ids)

      if (!result.success) {
        toast.error("Failed to delete some logs. Refreshing...")
        await fetchLogs()
        return
      }
      toast.success(`Deleted ${ids.length} ${ids.length === 1 ? "log" : "logs"}`)
    } catch {
      toast.error("Delete failed. Refreshing...")
      await fetchLogs()
    } finally {
      setDeleting(false)
    }
  }, [selectedIds, fetchLogs])

  const allSelected = logs.length > 0 && selectedIds.size === logs.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < logs.length

  const totalLabels = useMemo(
    () => logs.reduce((sum, l) => sum + l.labelsPrinted, 0),
    [logs]
  )
  const batchCount = useMemo(
    () => logs.filter((l) => l.printType === "batch").length,
    [logs]
  )
  const individualCount = useMemo(
    () => logs.filter((l) => l.printType === "individual").length,
    [logs]
  )

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/items">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Printer className="h-6 w-6" />
            Barcode Print History
          </h1>
          <p className="text-sm text-muted-foreground">
            Track all barcode label prints with item details and stock snapshots
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Hash className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Prints</p>
                <p className="text-xl font-bold">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Barcode className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Labels (This Page)</p>
                <p className="text-xl font-bold">{totalLabels}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Batch / Individual (This Page)</p>
                <p className="text-xl font-bold">
                  {batchCount} / {individualCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 min-w-[12rem]">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Item name or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={printTypeFilter} onValueChange={setPrintTypeFilter}>
                <SelectTrigger className="w-[8rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="batch">Batch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleFilter} size="sm">
              <Calendar className="h-4 w-4 mr-1" />
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="flex-1 min-h-0 flex flex-col overflow-hidden p-0 sm:px-6 sm:pb-6">
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-muted/50 border-b shrink-0">
              <span className="text-sm font-medium">
                {selectedIds.size} {selectedIds.size === 1 ? "row" : "rows"} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="h-8 gap-1.5"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete Selected
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <DataEmptyState
              icon={<Printer className="h-12 w-12" />}
              title="No print logs found"
              description="Barcode print history will appear here after you print labels."
            />
          ) : (
            <>
                <Table containerClassName="flex-1 min-h-0 max-h-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[2.75rem] min-w-[2.75rem] pl-4">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? "indeterminate" : false}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all rows"
                        />
                      </TableHead>
                      <TableHead resizable className="w-[9.375rem] min-w-[7.5rem]">Date</TableHead>
                      <TableHead resizable className="w-[15rem] min-w-[10rem]">Item Name</TableHead>
                      <TableHead resizable className="w-[11.25rem] min-w-[8.75rem]">Barcode No.</TableHead>
                      <TableHead resizable className="w-[7.5rem] min-w-[5.625rem] text-right">Stock at Print</TableHead>
                      <TableHead resizable className="w-[7.5rem] min-w-[5.625rem] text-right">Labels Printed</TableHead>
                      <TableHead resizable className="w-[6.25rem] min-w-[5rem]">Print Type</TableHead>
                      <TableHead className="w-[5rem] min-w-[3.75rem]">Layout</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const checked = selectedIds.has(log.id)
                      return (
                        <TableRow
                          key={log.id}
                          data-state={checked ? "selected" : undefined}
                          className={checked ? "bg-muted/50" : undefined}
                        >
                          <TableCell className="pl-4">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleSelect(log.id)}
                              aria-label={`Select ${log.itemName}`}
                            />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatRelativeDate(log.printedAt)}
                          </TableCell>
                          <TableCell className="font-medium max-w-[14rem] truncate">
                            {log.itemName}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {log.barcodeNo ?? "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {log.stockAtPrint}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {log.labelsPrinted}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={log.printType === "batch" ? "default" : "secondary"}
                              className="text-xs capitalize"
                            >
                              {log.printType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground uppercase">
                            {log.layoutId}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              <div className="px-4 sm:px-0 py-3 shrink-0">
                <DataPagination
                  currentPage={pagination.currentPage}
                  totalPages={Math.ceil(totalCount / PAGE_SIZE)}
                  startIndex={(pagination.currentPage - 1) * PAGE_SIZE}
                  endIndex={Math.min(pagination.currentPage * PAGE_SIZE, totalCount)}
                  totalItems={totalCount}
                  visiblePages={pagination.visiblePages}
                  canGoNext={pagination.currentPage < Math.ceil(totalCount / PAGE_SIZE)}
                  canGoPrevious={pagination.currentPage > 1}
                  onPageChange={handlePageChange}
                  onNextPage={() => handlePageChange(pagination.currentPage + 1)}
                  onPreviousPage={() => handlePageChange(pagination.currentPage - 1)}
                  itemLabel="logs"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
