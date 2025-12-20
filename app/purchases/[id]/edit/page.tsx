import { getPurchase } from "@/app/purchases/actions"
import { PurchaseEditor } from "@/components/purchases/purchase-editor"
import { notFound } from "next/navigation"

export default async function EditPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const purchase = await getPurchase(id)

  if (!purchase) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Purchase Order</h1>
        <p className="text-muted-foreground mt-1">Update purchase order details and line items</p>
      </div>
      <PurchaseEditor purchase={purchase} />
    </div>
  )
}
