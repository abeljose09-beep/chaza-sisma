import { useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, setDoc, deleteDoc, runTransaction, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useStore } from '../store/useStore';
import type { Product, Client, UserProfile } from '../types';

export const useFirebase = () => {
  const { setProducts, setClients, setUser } = useStore();

  useEffect(() => {
    // Auth State - Persistencia real
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Listen to own profile in real-time
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubProfile = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setUser({ uid: firebaseUser.uid, ...snapshot.data() } as UserProfile);
          }
        });
        return () => unsubProfile();
      } else {
        setUser(null);
      }
    });

    // Real-time Products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(items);
    });

    // Real-time Clients (Exclude Superuser from ALL views)
    const qClients = query(collection(db, 'users'), where('role', '!=', 'superuser'));
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as any[];
      setClients(items as Client[]);
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
      const counterRef = doc(db, 'metadata', 'orderCounter');
      const counterDoc = await transaction.get(counterRef);
      let nextNum = 1;
      if (counterDoc.exists()) {
        nextNum = counterDoc.data().count + 1;
      }
      
      const orderRef = doc(collection(db, 'orders'));
      transaction.set(orderRef, {
        ...orderData,
        orderNum: nextNum,
        createdAt: Date.now()
      });

      transaction.set(counterRef, { count: nextNum }, { merge: true });

      for (const item of orderData.items) {
        const prodRef = doc(db, 'products', item.id);
        const prodSnap = await transaction.get(prodRef);
        if (prodSnap.exists()) {
          transaction.update(prodRef, { stock: prodSnap.data().stock - item.quantity });
        }
      }

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
      const orderSnap = await transaction.get(orderRef);
      
      if (!orderSnap.exists() || orderSnap.data().status === 'paid') return;

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
