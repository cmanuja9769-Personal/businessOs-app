import { getItemById, getItemStockDistribution, getItemStockLedger, getItemInvoiceUsage } from "../actions"
import { getGodowns } from "@/app/godowns/actions"
import { notFound } from "next/navigation"
import { ItemDetailsClient } from "@/components/items/item-details-client"

interface ItemDetailsPageProps {
  params: Promise<{ id: string }>
}

export default async function ItemDetailsPage({ params }: ItemDetailsPageProps) {
  const { id } = await params
  
  const [item, godowns, stockDistribution, stockLedger, invoiceUsage] = await Promise.all([
    getItemById(id),
    getGodowns(),
    getItemStockDistribution(id),
    getItemStockLedger(id),
    getItemInvoiceUsage(id),
  ])

  if (!item) {
    notFound()
  }

  return (
    <ItemDetailsClient
      item={item}
      godowns={godowns}
      stockDistribution={stockDistribution}
      stockLedger={stockLedger}
      invoiceUsage={invoiceUsage}
    />
  )
}
