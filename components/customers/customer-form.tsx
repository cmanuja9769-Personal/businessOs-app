"use client"

import type React from "react"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { customerSchema, type CustomerFormData } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody } from "@/components/ui/dialog"
import { Plus, Loader2, Search } from "lucide-react"
import { createCustomer, updateCustomer, lookupGSTDetails } from "@/app/customers/actions"
import { toast } from "sonner"
import type { ICustomer } from "@/types"

interface CustomerFormProps {
  customer?: ICustomer
  trigger?: React.ReactNode
}

export function CustomerForm({ customer, trigger }: CustomerFormProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFetchingGST, setIsFetchingGST] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer
      ? {
          name: customer.name,
          contactNo: customer.contactNo,
          email: customer.email || "",
          address: customer.address || "",
          openingBalance: customer.openingBalance,
          openingDate: customer.openingDate,
          gstinNo: customer.gstinNo || "",
        }
      : {
          openingBalance: 0,
          openingDate: new Date(),
        },
  })

  const gstinValue = watch("gstinNo")

  // Auto-fetch GST details when valid GSTIN is entered
  const handleGSTLookup = async () => {
    const gstin = gstinValue?.trim().toUpperCase()
    
    if (!gstin || gstin.length !== 15) {
      toast.error("Please enter a valid 15-character GST number")
      return
    }

    setIsFetchingGST(true)
    try {
      const result = await lookupGSTDetails(gstin)
      
      if (result.success && result.data) {
        // Auto-fill the form with fetched details
        setValue("name", result.data.legalName || result.data.tradeName || "")
        setValue("address", result.data.address)
        
        toast.success("GST details fetched successfully")
      } else {
        toast.error(result.error || "Could not fetch GST details")
      }
    } catch (error) {
      toast.error("Failed to fetch GST details. Please try again.")
    } finally {
      setIsFetchingGST(false)
    }
  }

  const onSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString())
        }
      })

      if (customer) {
        await updateCustomer(customer.id, formData)
        toast.success("Customer updated successfully")
      } else {
        await createCustomer(formData)
        toast.success("Customer created successfully")
      }

      setOpen(false)
      reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save customer")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{customer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
        </DialogHeader>
        <DialogBody>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input id="name" {...register("name")} placeholder="Enter customer name" />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactNo">
                Contact Number <span className="text-destructive">*</span>
              </Label>
              <Input id="contactNo" {...register("contactNo")} placeholder="10-15 digits" />
              {errors.contactNo && <p className="text-sm text-destructive">{errors.contactNo.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} placeholder="customer@example.com" />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" {...register("address")} placeholder="Enter full address" rows={3} />
            {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="openingBalance">Opening Balance</Label>
              <Input id="openingBalance" type="number" step="0.01" {...register("openingBalance")} placeholder="0.00" />
              {errors.openingBalance && <p className="text-sm text-destructive">{errors.openingBalance.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="openingDate">Opening Date</Label>
              <Input
                id="openingDate"
                type="date"
                {...register("openingDate")}
                defaultValue={new Date().toISOString().split("T")[0]}
              />
              {errors.openingDate && <p className="text-sm text-destructive">{errors.openingDate.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gstinNo">GSTIN Number</Label>
            <div className="flex gap-2">
              <Input 
                id="gstinNo" 
                {...register("gstinNo")} 
                placeholder="15 characters (e.g., 22AAAAA0000A1Z5)" 
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleGSTLookup}
                disabled={isFetchingGST || !gstinValue || gstinValue.length !== 15}
                className="shrink-0"
              >
                {isFetchingGST ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
            {errors.gstinNo && <p className="text-sm text-destructive">{errors.gstinNo.message}</p>}
            <p className="text-xs text-muted-foreground">
              Enter GST number and click the search button to auto-fill customer details
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {customer ? "Update" : "Create"} Customer
            </Button>
          </div>
        </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
