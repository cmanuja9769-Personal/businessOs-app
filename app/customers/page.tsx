import { getCustomers } from "./actions"
import { CustomerForm } from "@/components/customers/customer-form"
import { CustomerUploadBtn } from "@/components/customers/customer-upload-btn"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { CardTitleWithCount } from "@/components/ui/card-title-with-count"
import { Users } from "lucide-react"
import { CustomersTable } from "@/components/customers/customers-table"
import Link from "next/link"

type CustomersSearchParams = {
  q?: string | string[]
  gstin?: string | string[]
  sort?: string | string[]
  dir?: string | string[]
}

function spValue(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "")
}

export default async function CustomersPage({ searchParams }: { searchParams?: Promise<CustomersSearchParams> }) {
  const customers = await getCustomers()
  const params = await searchParams

  const q = spValue(params?.q).trim()
  const gstin = spValue(params?.gstin).trim().toLowerCase() || "all"
  const sort = spValue(params?.sort).trim().toLowerCase() || "updated"
  const dir = (spValue(params?.dir).trim().toLowerCase() || "desc") as "asc" | "desc"

  const filteredCustomers = customers
    .filter((c) => {
      if (!q) return true
      const haystack = [c.name, c.id, c.contactNo, c.email || "", c.address || "", c.gstinNo || ""]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q.toLowerCase())
    })
    .filter((c) => {
      if (!gstin || gstin === "all") return true
      const has = !!(c.gstinNo && c.gstinNo.trim())
      return gstin === "with" ? has : !has
    })
    .sort((a, b) => {
      const m = dir === "asc" ? 1 : -1
      if (sort === "name") return m * a.name.localeCompare(b.name)
      if (sort === "contact") return m * String(a.contactNo || "").localeCompare(String(b.contactNo || ""))
      return m * (a.updatedAt.getTime() - b.updatedAt.getTime())
    })

  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 h-full flex flex-col overflow-hidden">
      <PageHeader
        title="Customers"
        description="Manage your customer database and relationships"
        actions={
          <div className="flex flex-row gap-2 w-full sm:w-auto">
            <CustomerUploadBtn />
            <CustomerForm />
          </div>
        }
      />

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="py-3 px-4 shrink-0">
          <CardTitleWithCount
            icon={<Users className="w-4 h-4 sm:w-5 sm:h-5" />}
            title="All Customers"
            mobileTitle="Customers"
            count={filteredCustomers.length}
          />
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden px-4 pb-4 pt-0">
          {filteredCustomers.length === 0 ? (
            <DataEmptyState
              icon={<Users className="w-12 h-12" />}
              title="No customers found"
              description="Try adjusting filters or add a new customer"
              action={<CustomerForm />}
            />
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden flex-1 min-h-0 overflow-y-auto space-y-2">
                {filteredCustomers.map((customer) => (
                  <Link
                    key={customer.id}
                    href={`/customers/${customer.id}`}
                    className="block p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{customer.name}</div>
                        <div className="text-xs text-muted-foreground">{customer.contactNo}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold text-sm">₹{customer.openingBalance.toFixed(0)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">{customer.email || "No email"}</span>
                      {customer.gstinNo && (
                        <Badge variant="outline" className="text-[10px] shrink-0">GST</Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              {/* Desktop Table View */}
              <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-hidden">
                <CustomersTable customers={filteredCustomers} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
