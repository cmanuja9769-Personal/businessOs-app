"use client"

import { useEffect, useState, useTransition, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  RotateCcw,
  Loader2,
  Warehouse,
  MapPin,
  Phone,
  User,
  Mail,
  ArrowRightLeft,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  softDeleteWarehouse,
  reactivateWarehouse,
  setDefaultWarehouse,
  type Warehouse as WarehouseType,
} from "@/app/godowns/actions"
import { toast } from "sonner"

interface WarehouseFormData {
  name: string
  address: string
  phone: string
  contactPerson: string
  email: string
  capacityNotes: string
  isDefault: boolean
}

const emptyForm: WarehouseFormData = {
  name: "",
  address: "",
  phone: "",
  contactPerson: "",
  email: "",
  capacityNotes: "",
  isDefault: false,
}

export function WarehouseListManager() {
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([])
  const [showInactive, setShowInactive] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseType | null>(null)
  const [formData, setFormData] = useState<WarehouseFormData>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<WarehouseType | null>(null)
  const [deleteError, setDeleteError] = useState("")

  const loadWarehouses = useCallback(() => {
    startTransition(() => {
      getWarehouses(showInactive)
        .then(setWarehouses)
        .catch(() => toast.error("Failed to load warehouses"))
    })
  }, [showInactive])

  useEffect(() => {
    loadWarehouses()
  }, [loadWarehouses])

  const openCreateForm = () => {
    setEditingWarehouse(null)
    setFormData(emptyForm)
    setIsFormOpen(true)
  }

  const openEditForm = (wh: WarehouseType) => {
    setEditingWarehouse(wh)
    setFormData({
      name: wh.name,
      address: wh.address,
      phone: wh.phone,
      contactPerson: wh.contactPerson,
      email: wh.email,
      capacityNotes: wh.capacityNotes,
      isDefault: wh.isDefault,
    })
    setIsFormOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Warehouse name is required")
      return
    }

    setIsSubmitting(true)
    try {
      if (editingWarehouse) {
        const res = await updateWarehouse({ id: editingWarehouse.id, ...formData })
        if (!res.success) throw new Error(res.error)
        toast.success("Warehouse updated")
      } else {
        const res = await createWarehouse(formData)
        if (!res.success) throw new Error(res.error)
        toast.success("Warehouse created")
      }
      setIsFormOpen(false)
      loadWarehouses()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Operation failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteError("")

    const res = await softDeleteWarehouse(deleteTarget.id)
    if (!res.success) {
      if ("requiresTransfer" in res && res.requiresTransfer) {
        setDeleteError(res.error)
        return
      }
      toast.error(res.error)
      setDeleteTarget(null)
      return
    }

    toast.success("Warehouse deactivated")
    setDeleteTarget(null)
    loadWarehouses()
  }

  const handleReactivate = async (wh: WarehouseType) => {
    const res = await reactivateWarehouse(wh.id)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success("Warehouse reactivated")
    loadWarehouses()
  }

  const handleSetDefault = async (wh: WarehouseType) => {
    const res = await setDefaultWarehouse(wh.id)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(`${wh.name} set as default warehouse`)
    loadWarehouses()
  }

  const activeCount = warehouses.filter(w => w.isActive).length
  const inactiveCount = warehouses.filter(w => !w.isActive).length

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              Warehouses
            </CardTitle>
            <CardDescription>
              {activeCount} active{inactiveCount > 0 && `, ${inactiveCount} inactive`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={showInactive}
                onCheckedChange={(v) => setShowInactive(v === true)}
              />
              Show inactive
            </Label>
            <Button onClick={openCreateForm} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Warehouse
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isPending && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isPending && warehouses.length === 0 && (
            <div className="text-center py-12">
              <Warehouse className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No warehouses found</p>
              <Button onClick={openCreateForm} variant="outline" className="mt-3" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Create your first warehouse
              </Button>
            </div>
          )}
          {!isPending && warehouses.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Code</TableHead>
                    <TableHead className="hidden lg:table-cell">Address</TableHead>
                    <TableHead className="hidden lg:table-cell">Contact</TableHead>
                    <TableHead className="hidden md:table-cell">Bin/Rack</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-[3rem]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouses.map((wh) => (
                    <TableRow key={wh.id} className={cn(!wh.isActive && "opacity-50 bg-muted/30")}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{wh.name}</span>
                          {wh.isDefault && (
                            <Badge variant="default" className="text-[0.625rem] px-1.5 py-0">
                              <Star className="h-2.5 w-2.5 mr-0.5" />
                              Default
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                        {wh.code}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[12rem] truncate">
                        {wh.address || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {wh.contactPerson || wh.phone || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[8rem] truncate">
                        {wh.capacityNotes || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {wh.isActive ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditForm(wh)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {wh.isActive && !wh.isDefault && (
                              <DropdownMenuItem onClick={() => handleSetDefault(wh)}>
                                <Star className="h-4 w-4 mr-2" />
                                Set as Default
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {wh.isActive ? (
                              <DropdownMenuItem
                                onClick={() => { setDeleteError(""); setDeleteTarget(wh) }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleReactivate(wh)}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {editingWarehouse ? "Edit Warehouse" : "Add Warehouse"}
            </DialogTitle>
            <DialogDescription>
              {editingWarehouse ? "Update warehouse details" : "Create a new warehouse location"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            <div className="space-y-4 p-1">
              <div className="space-y-2">
                <Label htmlFor="wh-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="wh-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Main Godown"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wh-address" className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Address
                </Label>
                <Textarea
                  id="wh-address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Full warehouse address"
                  className="resize-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="wh-contact" className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Contact Person
                  </Label>
                  <Input
                    id="wh-contact"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                    placeholder="Ramesh Kumar"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wh-phone" className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    Phone
                  </Label>
                  <Input
                    id="wh-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wh-email" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </Label>
                <Input
                  id="wh-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="warehouse@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wh-bins">
                  Bin/Rack Location Notes
                </Label>
                <Input
                  id="wh-bins"
                  value={formData.capacityNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacityNotes: e.target.value }))}
                  placeholder="e.g. Aisle 4, Rack B — 200 carton capacity"
                />
              </div>

              <Label className="flex items-center gap-2 cursor-pointer pt-1">
                <Checkbox
                  checked={formData.isDefault}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, isDefault: v === true }))}
                />
                Set as default warehouse for sales invoices
              </Label>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingWarehouse ? "Save Changes" : "Create Warehouse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteError("") } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {deleteError ? <AlertTriangle className="h-5 w-5 text-amber-500" /> : <Trash2 className="h-5 w-5 text-destructive" />}
              {deleteError ? "Stock Exists — Transfer Required" : "Deactivate Warehouse"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError ? (
                <span className="text-amber-600 dark:text-amber-400">{deleteError}</span>
              ) : (
                <>
                  Are you sure you want to deactivate <strong>{deleteTarget?.name}</strong>? Inactive warehouses won&apos;t appear in dropdowns but historical data is preserved.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {deleteError ? (
              <Button onClick={() => { setDeleteTarget(null); setDeleteError("") }}>
                <ArrowRightLeft className="h-4 w-4 mr-1" />
                Go to Stock Transfer
              </Button>
            ) : (
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Deactivate
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
