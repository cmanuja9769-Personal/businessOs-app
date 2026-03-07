import Link from "next/link"
import { ArrowRight, BarChart3, Box, FileText, Package, ShieldCheck, Users } from "lucide-react"

const features = [
  { icon: FileText, title: "GST Invoicing", desc: "Create invoices, quotations, sales orders & credit notes with built-in GST" },
  { icon: Package, title: "Inventory Management", desc: "Multi-warehouse stock tracking with barcode support and batch management" },
  { icon: Users, title: "CRM & Parties", desc: "Manage customers, suppliers with GSTIN lookup and opening balances" },
  { icon: BarChart3, title: "Reports & Analytics", desc: "GSTR-1, GSTR-3B, P&L, cash flow, outstanding, and party ledger reports" },
  { icon: Box, title: "Purchase Orders", desc: "Track purchases, supplier payments, and purchase returns seamlessly" },
  { icon: ShieldCheck, title: "Role-Based Access", desc: "Admin, salesperson, accountant & viewer roles with granular permissions" },
]

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Interactive Demo
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Experience <span className="text-primary">BusinessOS</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Explore the complete business management platform with realistic sample data.
            No sign-up required — see invoicing, inventory, reports, and more in action.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/demo/enter"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl active:scale-[0.98]"
            >
              Launch Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-base font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Sign In Instead
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl glass-subtle p-5 neo-shadow-sm transition-all hover:border-primary/30 hover:scale-[1.02]"
            >
              <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2.5 text-primary transition-colors group-hover:bg-primary/20">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl glass-subtle p-4 text-center">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Demo mode is read-only.</strong> You can browse all pages and features, but changes will not be saved. Sign up for a free account to start managing your business.
          </p>
        </div>
      </div>
    </div>
  )
}
