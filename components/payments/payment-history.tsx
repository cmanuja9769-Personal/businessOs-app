import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import type { IPayment } from "@/types"
import { DollarSign } from "lucide-react"

interface PaymentHistoryProps {
  payments: IPayment[]
}

const paymentMethodLabels = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  other: "Other",
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Payment History
          </CardTitle>
          <CardDescription>Track all payments received for this transaction</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">No payments recorded yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Payment History ({payments.length})
        </CardTitle>
        <CardDescription>Track all payments received for this transaction</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{format(payment.paymentDate, "dd MMM yyyy")}</TableCell>
                <TableCell className="font-semibold text-green-600">₹{payment.amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{paymentMethodLabels[payment.paymentMethod]}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{payment.referenceNumber || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{payment.notes || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
