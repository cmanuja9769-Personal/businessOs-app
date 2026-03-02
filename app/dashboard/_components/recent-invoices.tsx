import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, Plus, ArrowRight, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import type { RecentInvoice } from "./dashboard-types"
import { dashboardFormatDate } from "./dashboard-types"
import { formatCurrency } from "@/lib/format-utils"

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    paid: { variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
    pending: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
    draft: { variant: "outline", icon: <FileText className="h-3 w-3" /> },
    cancelled: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
    overdue: { variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
  }
  const config = statusConfig[status] || statusConfig.draft
  return (
    <Badge variant={config.variant} className="text-xs gap-1">
      {config.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

interface RecentInvoicesProps {
  readonly invoices: RecentInvoice[]
  readonly loading: boolean
}

export function RecentInvoices({ invoices, loading }: RecentInvoicesProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold">Recent Invoices</CardTitle>
        </div>
        <Link href="/invoices">
          <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2">
            View all
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {loading && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {!loading && invoices.length === 0 && (
          <div className="text-center py-6">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">No invoices yet</p>
            <Link href="/invoices/new">
              <Button size="sm" className="mt-2 text-xs h-7">
                <Plus className="h-3.5 w-3.5 mr-1" /> Create Invoice
              </Button>
            </Link>
          </div>
        )}
        {!loading && invoices.length > 0 && (
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-xs truncate max-w-[7.5rem]">{invoice.invoiceNo}</span>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <p className="text-[0.625rem] text-muted-foreground truncate">{invoice.customerName}</p>
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                  <p className="font-semibold text-xs">{formatCurrency(invoice.total)}</p>
                  <p className="text-[0.625rem] text-muted-foreground">{dashboardFormatDate(invoice.date)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
