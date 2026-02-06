import { PurchaseBuilder } from "@/components/purchases/purchase-builder"
import { PageHeader } from "@/components/ui/page-header"

export default function NewPurchasePage() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader
        title="New Purchase Order"
        description="Create a new purchase order for inventory"
      />
      <PurchaseBuilder />
    </div>
  )
}
