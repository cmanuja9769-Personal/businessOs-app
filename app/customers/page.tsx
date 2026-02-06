import { getCustomers } from "./actions"
import { CustomerForm } from "@/components/customers/customer-form"
import { CustomerUploadBtn } from "@/components/customers/customer-upload-btn"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { CardTitleWithCount } from "@/components/ui/card-title-with-count"
import { Edit, Users } from "lucide-react"
import { DeleteButton } from "@/components/customers/delete-button"
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
              <Table containerClassName="hidden md:block flex-1 min-h-0 max-h-full">
                <TableHeader>
                  <TableRow>
                    <TableHead resizable className="w-[200px] min-w-[150px]">Name</TableHead>
                    <TableHead resizable className="w-[100px] min-w-[80px]">Contact</TableHead>
                    <TableHead resizable className="w-[150px] min-w-[100px]">Email</TableHead>
                    <TableHead resizable className="w-[180px] min-w-[120px]">Address</TableHead>
                    <TableHead resizable className="w-[100px] min-w-[80px]">GSTIN</TableHead>
                    <TableHead resizable className="w-[100px] min-w-[80px] text-right">Opening Balance</TableHead>
                    <TableHead className="w-[80px] min-w-[70px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium truncate" title={customer.name}>
                        <Link
                          href={`/customers/${customer.id}`}
                          className="hover:underline hover:text-primary text-xs sm:text-sm"
                        >
                          {customer.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm" title={customer.contactNo || ""}>
                        {customer.contactNo}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm truncate" title={customer.email || ""}>
                        {customer.email || "-"}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm truncate max-w-[150px]" title={customer.address || ""}>
                        {customer.address || "-"}
                      </TableCell>
                      <TableCell>
                        {customer.gstinNo ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {customer.gstinNo.slice(0, 8)}...
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell
                        className="font-semibold text-right text-xs sm:text-sm"
                        title={`₹${customer.openingBalance.toFixed(2)}`}
                      >
                        ₹{customer.openingBalance.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <CustomerForm
                            customer={customer}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Customer">
                                <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                            }
                          />
                          <DeleteButton customerId={customer.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
