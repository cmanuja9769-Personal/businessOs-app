import { getCustomers } from "./actions"
import { CustomerForm } from "@/components/customers/customer-form"
import { CustomerUploadBtn } from "@/components/customers/customer-upload-btn"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Edit, Users } from "lucide-react"
import { DeleteButton } from "@/components/customers/delete-button"

export default async function CustomersPage() {
  const customers = await getCustomers()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">Manage your customer database and relationships</p>
        </div>
        <div className="flex gap-3">
          <CustomerUploadBtn />
          <CustomerForm />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              All Customers ({customers.length})
            </CardTitle>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="search" placeholder="Search customers..." className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No customers yet</h3>
              <p className="text-muted-foreground mb-4">Get started by adding your first customer</p>
              <CustomerForm />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-mono text-sm">{customer.id}</TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.contactNo}</TableCell>
                    <TableCell>{customer.email || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{customer.gstinNo || "-"}</TableCell>
                    <TableCell className="font-semibold">₹{customer.openingBalance.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <CustomerForm
                          customer={customer}
                          trigger={
                            <Button variant="ghost" size="icon">
                              <Edit className="w-4 h-4" />
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
