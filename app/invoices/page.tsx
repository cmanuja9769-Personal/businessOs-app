import { getInvoices } from "./actions"
import { InvoicesContent } from "@/components/invoices/invoices-content"

export default async function InvoicesPage() {
  const invoices = await getInvoices()

  return <InvoicesContent invoices={invoices} />
}
