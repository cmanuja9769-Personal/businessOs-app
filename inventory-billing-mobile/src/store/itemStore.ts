import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Item {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  min_stock: number;
  selling_price: number;
}

interface ItemStore {
  items: Item[];
  selectedItem: Item | null;
  setItems: (items: Item[]) => void;
  addItem: (item: Item) => void;
  updateItem: (id: string, item: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  setSelectedItem: (item: Item | null) => void;
}

export const useItemStore = create<ItemStore>()(
  persist(
    (set) => ({
      items: [],
      selectedItem: null,
      setItems: (items) => set({ items }),
      addItem: (item) => set((state) => ({ items: [item, ...state.items] })),
      updateItem: (id, updatedItem) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updatedItem } : item
          ),
        })),
      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      setSelectedItem: (item) => set({ selectedItem: item }),
    }),
    {
      name: 'item-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
