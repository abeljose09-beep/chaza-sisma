import { useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, addDoc, updateDoc, doc } from 'firebase/firestore';
import { useStore } from '../store/useStore';
import type { Product, Client } from '../types';

export const useFirebase = () => {
  const { setProducts, setClients } = useStore();

  useEffect(() => {
    // Sync Products
    const qProducts = query(collection(db, 'products'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(items);
    });

    // Sync Clients
    const qClients = query(collection(db, 'clients'));
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Client[];
      setClients(items);
    });

    return () => {
      unsubProducts();
      unsubClients();
    };
  }, [setProducts, setClients]);

  const addProduct = async (product: Omit<Product, 'id'>) => {
    await addDoc(collection(db, 'products'), product);
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    await updateDoc(doc(db, 'products', id), updates);
  };

  const addClient = async (client: Omit<Client, 'id'>) => {
    await addDoc(collection(db, 'clients'), client);
  };

  const addOrder = async (order: any) => {
    await addDoc(collection(db, 'orders'), order);
  };

  return { addProduct, updateProduct, addClient, addOrder };
};
