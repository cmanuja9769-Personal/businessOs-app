"use client"

import { getItems } from "@/app/items/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { BarcodeDisplay } from "@/components/items/barcode-display"

export default async function BarcodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const items = await getItems()
  const item = items.find((i) => i.id === id)

  if (!item) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Item not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/items">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Barcode Preview</h1>
            <p className="text-muted-foreground">{item.name}</p>
          </div>
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" />
          Print
        </Button>
      </div>

      <BarcodeDisplay item={item} />
    </div>
  )
}
