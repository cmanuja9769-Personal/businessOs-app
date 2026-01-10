import { PurchaseBuilder } from "@/components/purchases/purchase-builder"

export default function NewPurchasePage() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">New Purchase Order</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Create a new purchase order for inventory</p>
      </div>
      <PurchaseBuilder />
    </div>
  )
}
