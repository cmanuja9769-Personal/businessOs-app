import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { IItem } from "@/types"

export interface BarcodeQueueEntry {
  item: IItem
  quantity: number
  hindiName?: string
}

interface BarcodeQueueState {
  queue: BarcodeQueueEntry[]
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void
  addToQueue: (entry: BarcodeQueueEntry) => void
  removeFromQueue: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  updateHindiName: (itemId: string, hindiName: string | undefined) => void
  clearQueue: () => void
  totalLabels: () => number
}

export const useBarcodeQueueStore = create<BarcodeQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      isModalOpen: false,

      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false }),

      addToQueue: (entry) =>
        set((state) => {
          const existing = state.queue.find((e) => e.item.id === entry.item.id)
          if (existing) {
            return {
              queue: state.queue.map((e) =>
                e.item.id === entry.item.id
                  ? { ...e, quantity: e.quantity + entry.quantity }
                  : e
              ),
            }
          }
          return { queue: [...state.queue, entry] }
        }),

      removeFromQueue: (itemId) =>
        set((state) => ({
          queue: state.queue.filter((e) => e.item.id !== itemId),
        })),

      updateQuantity: (itemId, quantity) =>
        set((state) => ({
          queue: state.queue.map((e) =>
            e.item.id === itemId ? { ...e, quantity: Math.max(1, quantity) } : e
          ),
        })),

      updateHindiName: (itemId, hindiName) =>
        set((state) => ({
          queue: state.queue.map((e) =>
            e.item.id === itemId ? { ...e, hindiName } : e
          ),
        })),

      clearQueue: () => set({ queue: [] }),

      totalLabels: () => get().queue.reduce((sum, e) => sum + e.quantity, 0),
    }),
    {
      name: "barcode-queue",
      partialize: (state) => ({ queue: state.queue }),
    }
  )
)
