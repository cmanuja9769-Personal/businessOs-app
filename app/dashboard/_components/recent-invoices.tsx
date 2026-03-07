import Link from "next/link"
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from "@/components/ui/glass-card"
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
    <Badge variant={config.variant} className="text-[0.625rem] gap-0.5 px-1.5 py-0 h-5 rounded-full">
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
    <GlassCard glow>
      <GlassCardHeader>
        <GlassCardTitle>Recent Invoices</GlassCardTitle>
        <Link
          href="/invoices"
          className="flex items-center gap-1 text-[0.6875rem] font-medium text-primary hover:underline transition-colors"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </GlassCardHeader>
      <GlassCardContent>
        {loading && (
          <div className="space-y-2.5">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        )}
        {!loading && invoices.length === 0 && (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-muted/50 neo-inset flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mb-3">No invoices yet</p>
            <Link
              href="/invoices/new"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Invoice
            </Link>
          </div>
        )}
        {!loading && invoices.length > 0 && (
          <div className="space-y-1.5">
            {invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="flex items-center justify-between p-2.5 rounded-2xl glass-subtle transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-xs truncate max-w-[7.5rem]">{invoice.invoiceNo}</span>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <p className="text-[0.625rem] text-muted-foreground/70 truncate mt-0.5">{invoice.customerName}</p>
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                  <p className="font-bold text-xs">{formatCurrency(invoice.total)}</p>
                  <p className="text-[0.625rem] text-muted-foreground/70">{dashboardFormatDate(invoice.date)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
