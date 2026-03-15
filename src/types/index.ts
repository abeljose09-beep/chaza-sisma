export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  debt: number; // For the "cuentas de cobro" if they buy over time
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  clientId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'paid';
  createdAt: number;
}
