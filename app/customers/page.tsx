import { getCustomers } from "./actions"
import { CustomerForm } from "@/components/customers/customer-form"
import { CustomerUploadBtn } from "@/components/customers/customer-upload-btn"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
      // updated
      return m * (a.updatedAt.getTime() - b.updatedAt.getTime())
    })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your customer database and relationships
          </p>
        </div>
        <div className="flex flex-col xs:flex-row gap-3 w-full sm:w-auto">
          <CustomerUploadBtn />
          <CustomerForm />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="w-5 h-5" />
            <span className="hidden sm:inline">All Customers</span>
            <span className="sm:hidden">Customers</span>
            <span className="text-muted-foreground">({filteredCustomers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No customers found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting filters or add a new customer</p>
              <CustomerForm />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Name</TableHead>
                  <TableHead className="min-w-[100px]">Contact</TableHead>
                  <TableHead className="min-w-[120px]">Email</TableHead>
                  <TableHead className="min-w-[150px]">Address</TableHead>
                  <TableHead className="min-w-[100px]">GSTIN</TableHead>
                  <TableHead className="min-w-[110px] text-right">Opening Balance</TableHead>
                  <TableHead className="min-w-[80px] text-right">Actions</TableHead>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
