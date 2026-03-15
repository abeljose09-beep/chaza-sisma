import { useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, getDoc, setDoc, deleteDoc, runTransaction } from 'firebase/firestore';
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
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Usuario',
            email: firebaseUser.email || '',
            role: 'client'
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), { ...newProfile, debt: 0 });
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

    // Sync Clients/Users
    const qClients = query(collection(db, 'users'));
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as any[];
      // We want to show all clients in the Clients directory
      setClients(items.filter(i => i.role === 'client' || i.role === 'admin' || i.role === 'superuser') as Client[]);
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
    await deleteDoc(doc(db, 'products', id));
  };

  const addOrder = async (orderData: any) => {
    await runTransaction(db, async (transaction) => {
      // 1. Get next order number
      const counterDoc = await transaction.get(doc(db, 'metadata', 'orderCounter'));
      let nextNum = 1;
      if (counterDoc.exists()) {
        nextNum = counterDoc.data().count + 1;
      }
      
      // 2. Create the order
      const orderRef = doc(collection(db, 'orders'));
      transaction.set(orderRef, {
        ...orderData,
        orderNum: nextNum,
        createdAt: Date.now()
      });

      // 3. Update counter
      transaction.set(doc(db, 'metadata', 'orderCounter'), { count: nextNum }, { merge: true });

      // 4. Update product stocks
      for (const item of orderData.items) {
        const prodRef = doc(db, 'products', item.id);
        const prodSnap = await transaction.get(prodRef);
        if (prodSnap.exists()) {
          transaction.update(prodRef, { stock: prodSnap.data().stock - item.quantity });
        }
      }

      // 5. Update client debt
      const clientRef = doc(db, 'users', orderData.clientId);
      const clientSnap = await transaction.get(clientRef);
      if (clientSnap.exists()) {
        const currentDebt = clientSnap.data().debt || 0;
        transaction.update(clientRef, { debt: currentDebt + orderData.total });
      }
    });
  };

  const markOrderAsPaid = async (orderId: string, clientId: string, total: number) => {
    await runTransaction(db, async (transaction) => {
      const orderRef = doc(db, 'orders', orderId);
      transaction.update(orderRef, { status: 'paid' });

      const clientRef = doc(db, 'users', clientId);
      const clientSnap = await transaction.get(clientRef);
      if (clientSnap.exists()) {
        const currentDebt = clientSnap.data().debt || 0;
        transaction.update(clientRef, { debt: Math.max(0, currentDebt - total) });
      }
    });
  };

  const addClient = async (client: { name: string, email: string, phone: string }) => {
    const newRef = doc(collection(db, 'users'));
    await setDoc(newRef, { ...client, uid: newRef.id, role: 'client', debt: 0 });
  };

  return { addProduct, updateProduct, deleteProduct, addOrder, addClient, markOrderAsPaid };
};
