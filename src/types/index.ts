export type UserRole = 'superuser' | 'admin' | 'client';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
  imageUrl?: string;
}

export interface Client extends UserProfile {
  debt: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  orderNum: number;
  clientId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'paid';
  createdAt: number;
}
