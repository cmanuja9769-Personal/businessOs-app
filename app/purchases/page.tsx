import { getPurchases } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { CardTitleWithCount } from "@/components/ui/card-title-with-count"
import { Plus, ShoppingCart } from "lucide-react"
import Link from "next/link"
import { PurchasesTable } from "@/components/purchases/purchases-table"

export default async function PurchasesPage() {
  const purchases = await getPurchases()

  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 h-full flex flex-col overflow-hidden">
      <PageHeader
        title="Purchases"
        description="Manage and track all your purchase orders"
        actions={
          <Link href="/purchases/new">
            <Button className="w-full sm:w-auto gap-2 h-9 text-sm">
              <Plus className="w-4 h-4" />
              New Purchase
            </Button>
          </Link>
        }
      />

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="py-3 px-4 shrink-0">
          <CardTitleWithCount
            icon={<ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />}
            title="All Purchases"
            mobileTitle="Purchases"
            count={purchases.length}
          />
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden px-4 pb-4 pt-0">
          {purchases.length === 0 ? (
            <DataEmptyState
              icon={<ShoppingCart className="w-12 h-12" />}
              title="No purchases yet"
              description="Create your first purchase order to get started"
              action={
                <Link href="/purchases/new">
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Purchase
                  </Button>
                </Link>
              }
            />
          ) : (
            <PurchasesTable purchases={purchases} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
