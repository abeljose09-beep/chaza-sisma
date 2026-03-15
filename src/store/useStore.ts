import { create } from 'zustand';
import type { Product, Client, CartItem, UserProfile } from '../types';

interface StoreState {
  user: UserProfile | null;
  products: Product[];
  clients: Client[];
  activeCart: CartItem[];
  selectedClientId: string | null;
  
  // Actions
  setUser: (user: UserProfile | null) => void;
  setProducts: (products: Product[]) => void;
  setClients: (clients: Client[]) => void;
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  setSelectedClient: (clientId: string | null) => void;
  updateStock: (productId: string, diff: number) => void;
}

export const useStore = create<StoreState>((set) => ({
  user: null,
  products: [],
  clients: [],
  activeCart: [],
  selectedClientId: null,

  setUser: (user) => set({ user }),
  setProducts: (products) => set({ products }),
  setClients: (clients) => set({ clients }),
  
  addToCart: (product, quantity) => set((state) => {
    const existingIndex = state.activeCart.findIndex(item => item.id === product.id);
    if (existingIndex > -1) {
      const newCart = [...state.activeCart];
      newCart[existingIndex].quantity += quantity;
      return { activeCart: newCart };
    }
    return { activeCart: [...state.activeCart, { ...product, quantity }] };
  }),

  removeFromCart: (productId) => set((state) => ({
    activeCart: state.activeCart.filter(item => item.id !== productId)
  })),

  clearCart: () => set({ activeCart: [] }),
  
  setSelectedClient: (clientId) => set({ selectedClientId: clientId }),

  updateStock: (productId, diff) => set((state) => ({
    products: state.products.map(p => 
      p.id === productId ? { ...p, stock: p.stock + diff } : p
    )
  }))
}));
