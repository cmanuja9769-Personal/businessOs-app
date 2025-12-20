import { PurchaseBuilder } from "@/components/purchases/purchase-builder"

export default function NewPurchasePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Purchase Order</h1>
        <p className="text-muted-foreground mt-1">Create a new purchase order for inventory</p>
      </div>
      <PurchaseBuilder />
    </div>
  )
}
