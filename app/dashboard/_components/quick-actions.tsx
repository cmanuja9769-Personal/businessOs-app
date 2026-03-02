import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, ShoppingCart, Users, Package, BarChart3 } from "lucide-react"

export function QuickActions() {
  return (
    <Card className="bg-gradient-to-r from-primary/5 via-background to-primary/5 border-primary/20">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/invoices/new">
            <Button size="sm" className="gap-1.5 text-xs h-8">
              <Plus className="h-3.5 w-3.5" />
              New Invoice
            </Button>
          </Link>
          <Link href="/purchases/new">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
              <ShoppingCart className="h-3.5 w-3.5" />
              Purchase
            </Button>
          </Link>
          <Link href="/customers/new">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
              <Users className="h-3.5 w-3.5" />
              Customer
            </Button>
          </Link>
          <Link href="/items/new">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
              <Package className="h-3.5 w-3.5" />
              Item
            </Button>
          </Link>
          <Link href="/reports">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
              <BarChart3 className="h-3.5 w-3.5" />
              Reports
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
