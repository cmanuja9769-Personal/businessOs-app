"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  CreditCard, 
  Filter,
  IndianRupee,
  Loader2,
  PieChart,
  Plus
} from "lucide-react"
import Link from "next/link"
import { format, startOfMonth, endOfMonth } from "date-fns"

interface Expense {
  id: string
  expenseNo: string
  category: string
  description: string
  date: string
  amount: number
  paymentMethod: 'cash' | 'bank' | 'upi' | 'card'
  vendor?: string
  notes?: string
}

const EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Salaries',
  'Office Supplies',
  'Transportation',
  'Marketing',
  'Insurance',
  'Maintenance',
  'Professional Fees',
  'Miscellaneous'
]

export default function ExpenseReportPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      // Simulated data - replace with actual API call
      const mockExpenses: Expense[] = [
        {
          id: '1',
          expenseNo: 'EXP-001',
          category: 'Rent',
          description: 'Monthly office rent',
          date: new Date().toISOString(),
          amount: 25000,
          paymentMethod: 'bank',
          vendor: 'Property Owner'
        },
        {
          id: '2',
          expenseNo: 'EXP-002',
          category: 'Utilities',
          description: 'Electricity bill',
          date: new Date().toISOString(),
          amount: 5500,
          paymentMethod: 'upi'
        },
        {
          id: '3',
          expenseNo: 'EXP-003',
          category: 'Office Supplies',
          description: 'Stationery and printer ink',
          date: new Date().toISOString(),
          amount: 2500,
          paymentMethod: 'cash'
        }
      ]
      setExpenses(mockExpenses)
    } catch (error) {
      console.error('Failed to fetch expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date)
    const fromDate = new Date(dateFrom)
    const toDate = new Date(dateTo)
    toDate.setHours(23, 59, 59, 999)

    const dateMatch = expDate >= fromDate && expDate <= toDate
    const categoryMatch = categoryFilter === "all" || exp.category === categoryFilter

    return dateMatch && categoryMatch
  })

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)

  // Group by category
  const categoryBreakdown = filteredExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount
    return acc
  }, {} as Record<string, number>)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value)
  }

  const exportToCSV = () => {
    const headers = ['Expense No', 'Date', 'Category', 'Description', 'Amount', 'Payment Method', 'Vendor']
    const rows = filteredExpenses.map(exp => [
      exp.expenseNo,
      format(new Date(exp.date), 'dd/MM/yyyy'),
      exp.category,
      exp.description,
      exp.amount.toFixed(2),
      exp.paymentMethod,
      exp.vendor || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `expense-report-${dateFrom}-to-${dateTo}.csv`
    link.click()
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-red-600" />
              Expense Report
            </h1>
            <p className="text-sm text-muted-foreground">Categorized business expenses</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => window.print()} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
                <p className="text-xs text-muted-foreground">{filteredExpenses.length} entries</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10">
                <IndianRupee className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(categoryBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount]) => (
                  <div key={category} className="p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground truncate">{category}</p>
                    <p className="text-sm font-semibold">{formatCurrency(amount)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {((amount / totalExpenses) * 100).toFixed(1)}%
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expense No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Vendor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No expenses found for the selected filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell className="font-mono">{exp.expenseNo}</TableCell>
                        <TableCell>{format(new Date(exp.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{exp.category}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{exp.description}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {formatCurrency(exp.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {exp.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell>{exp.vendor || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
