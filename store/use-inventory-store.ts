import { create } from "zustand"
import type { ICustomer, IItem, IInvoice, IInvoiceItem } from "@/types"
import { dummyCustomers, dummyItems } from "@/lib/dummy-data" // Import dummy data

interface InventoryStore {
  // Customers
  customers: ICustomer[]
  setCustomers: (customers: ICustomer[]) => void
  addCustomer: (customer: ICustomer) => void
  updateCustomer: (id: string, customer: Partial<ICustomer>) => void
  deleteCustomer: (id: string) => void

  // Items
  items: IItem[]
  setItems: (items: IItem[]) => void
  addItem: (item: IItem) => void
  updateItem: (id: string, item: Partial<IItem>) => void
  deleteItem: (id: string) => void

  // Invoice (Current)
  currentInvoice: Partial<IInvoice> | null
  setCurrentInvoice: (invoice: Partial<IInvoice> | null) => void
  addInvoiceItem: (item: IInvoiceItem) => void
  updateInvoiceItem: (index: number, item: Partial<IInvoiceItem>) => void
  removeInvoiceItem: (index: number) => void
  clearCurrentInvoice: () => void

  // Invoices
  invoices: IInvoice[]
  setInvoices: (invoices: IInvoice[]) => void
  addInvoice: (invoice: IInvoice) => void
}

export const useInventoryStore = create<InventoryStore>((set) => ({
  // Customers - Initialize with dummy data
  customers: dummyCustomers,
  setCustomers: (customers) => set({ customers }),
  addCustomer: (customer) => set((state) => ({ customers: [...state.customers, customer] })),
  updateCustomer: (id, customer) =>
    set((state) => ({
      customers: state.customers.map((c) => (c.id === id ? { ...c, ...customer } : c)),
    })),
  deleteCustomer: (id) => set((state) => ({ customers: state.customers.filter((c) => c.id !== id) })),

  // Items - Initialize with dummy data
  items: dummyItems,
  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  updateItem: (id, item) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, ...item } : i)),
    })),
  deleteItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  // Invoice (Current)
  currentInvoice: null,
  setCurrentInvoice: (invoice) => set({ currentInvoice: invoice }),
  addInvoiceItem: (item) =>
    set((state) => ({
      currentInvoice: state.currentInvoice
        ? {
            ...state.currentInvoice,
            items: [...(state.currentInvoice.items || []), item],
          }
        : null,
    })),
  updateInvoiceItem: (index, item) =>
    set((state) => ({
      currentInvoice: state.currentInvoice
        ? {
            ...state.currentInvoice,
            items: state.currentInvoice.items?.map((i, idx) => (idx === index ? { ...i, ...item } : i)),
          }
        : null,
    })),
  removeInvoiceItem: (index) =>
    set((state) => ({
      currentInvoice: state.currentInvoice
        ? {
            ...state.currentInvoice,
            items: state.currentInvoice.items?.filter((_, idx) => idx !== index),
          }
        : null,
    })),
  clearCurrentInvoice: () => set({ currentInvoice: null }),

  // Invoices
  invoices: [],
  setInvoices: (invoices) => set({ invoices }),
  addInvoice: (invoice) => set((state) => ({ invoices: [...state.invoices, invoice] })),
}))
