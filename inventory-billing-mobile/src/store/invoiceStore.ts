import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  total: number;
  status: string;
}

interface InvoiceStore {
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  setInvoices: (invoices: Invoice[]) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  setSelectedInvoice: (invoice: Invoice | null) => void;
}

export const useInvoiceStore = create<InvoiceStore>()(
  persist(
    (set) => ({
      invoices: [],
      selectedInvoice: null,
      setInvoices: (invoices) => set({ invoices }),
      addInvoice: (invoice) =>
        set((state) => ({ invoices: [invoice, ...state.invoices] })),
      updateInvoice: (id, updatedInvoice) =>
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id ? { ...inv, ...updatedInvoice } : inv
          ),
        })),
      deleteInvoice: (id) =>
        set((state) => ({
          invoices: state.invoices.filter((inv) => inv.id !== id),
        })),
      setSelectedInvoice: (invoice) => set({ selectedInvoice: invoice }),
    }),
    {
      name: 'invoice-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
