import { useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useStore } from '../store/useStore';
import type { Product, Client, UserProfile } from '../types';

export const useFirebase = () => {
  const { setProducts, setClients, setUser } = useStore();

  useEffect(() => {
    // Auth State
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ uid: firebaseUser.uid, ...userDoc.data() } as UserProfile);
        } else {
          // If no doc, default to client (safe fallback)
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Usuario',
            email: firebaseUser.email || '',
            role: 'client'
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setUser(newProfile);
        }
      } else {
        setUser(null);
      }
    });

    // Sync Products
    const qProducts = query(collection(db, 'products'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(items);
    });

    // Sync Clients (Only if user has permissions, ideally)
    const qClients = query(collection(db, 'users'));
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setClients(items.filter(i => i.role === 'client') as Client[]);
    });

    return () => {
      unsubAuth();
      unsubProducts();
      unsubClients();
    };
  }, [setProducts, setClients, setUser]);

  const addProduct = async (product: Omit<Product, 'id'>) => {
    await addDoc(collection(db, 'products'), product);
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    await updateDoc(doc(db, 'products', id), updates);
  };

  const deleteProduct = async (id: string) => {
    console.log("Deleting product", id);
  };

  const addOrder = async (order: any) => {
    await addDoc(collection(db, 'orders'), order);
  };

  const addClient = async (client: { name: string, email: string, phone: string }) => {
    const newRef = doc(collection(db, 'users'));
    await setDoc(newRef, { ...client, uid: newRef.id, role: 'client', debt: 0 });
  };

  return { addProduct, updateProduct, deleteProduct, addOrder, addClient };
};
