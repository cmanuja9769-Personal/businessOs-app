import { DOCUMENT_TYPE_CONFIG, DocumentType } from "@/types"
import { Badge } from "@/components/ui/badge"
import { FileText, Receipt, Truck, FileCheck, FileSignature, FileX, FileWarning } from "lucide-react"

interface DocumentTypeBadgeProps {
  type: DocumentType
  className?: string
}

const DOCUMENT_BADGE_COLORS: Record<DocumentType, string> = {
  invoice: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  sales_order: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  quotation: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  proforma: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  delivery_challan: "bg-cyan-100 text-cyan-800 hover:bg-cyan-100",
  credit_note: "bg-red-100 text-red-800 hover:bg-red-100",
  debit_note: "bg-pink-100 text-pink-800 hover:bg-pink-100",
}

const DOCUMENT_ICONS: Record<DocumentType, React.ReactNode> = {
  invoice: <FileText className="w-3 h-3" />,
  sales_order: <FileSignature className="w-3 h-3" />,
  quotation: <Receipt className="w-3 h-3" />,
  proforma: <FileText className="w-3 h-3" />,
  delivery_challan: <Truck className="w-3 h-3" />,
  credit_note: <FileX className="w-3 h-3" />,
  debit_note: <FileWarning className="w-3 h-3" />,
}

export function DocumentTypeBadge({ type, className }: DocumentTypeBadgeProps) {
  const config = DOCUMENT_TYPE_CONFIG[type]
  const colorClass = DOCUMENT_BADGE_COLORS[type]

  return (
    <Badge variant="secondary" className={`${colorClass} ${className} flex items-center gap-1`}>
      {DOCUMENT_ICONS[type]}
      <span>{config.label}</span>
    </Badge>
  )
}
