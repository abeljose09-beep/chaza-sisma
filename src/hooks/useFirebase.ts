import { useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, setDoc, deleteDoc, runTransaction, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useStore } from '../store/useStore';
import type { Product, Client, UserProfile } from '../types';

export const useFirebase = () => {
  const { setProducts, setClients, setUser } = useStore();

  useEffect(() => {
    // Auth State
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        return onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setUser({ uid: firebaseUser.uid, ...snapshot.data() } as UserProfile);
          }
        });
      } else {
        setUser(null);
      }
    });

    // Real-time Products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(items);
    });

    // Real-time Clients (Exclude Superuser)
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
    try {
      await runTransaction(db, async (transaction) => {
        // --- 1. ALL READS FIRST ---
        const counterRef = doc(db, 'metadata', 'orderCounter');
        const counterDoc = await transaction.get(counterRef);
        
        const clientRef = doc(db, 'users', orderData.clientId);
        const clientSnap = await transaction.get(clientRef);

        const productSnaps = [];
        for (const item of orderData.items) {
          const prodRef = doc(db, 'products', item.id);
          productSnaps.push({ ref: prodRef, snap: await transaction.get(prodRef), item });
        }

        // --- 2. LOGIC ---
        let nextNum = 1;
        if (counterDoc.exists()) {
          nextNum = (counterDoc.data().count || 0) + 1;
        }

        // --- 3. ALL WRITES AFTER ---
        const orderRef = doc(collection(db, 'orders'));
        transaction.set(orderRef, {
          ...orderData,
          orderNum: nextNum,
          createdAt: Date.now()
        });

        transaction.set(counterRef, { count: nextNum }, { merge: true });

        // Update stocks
        for (const { ref, snap, item } of productSnaps) {
          if (snap.exists()) {
            transaction.update(ref, { stock: snap.data().stock - item.quantity });
          }
        }

        // Update debt
        if (clientSnap.exists()) {
          const currentDebt = clientSnap.data().debt || 0;
          transaction.update(clientRef, { debt: currentDebt + orderData.total });
        }
      });
      return true;
    } catch (e: any) {
      console.error("DEBUG ORDER ERROR:", e);
      throw new Error(e.message || "Error desconocido en Firebase");
    }
  };

  const markMultipleOrdersAsPaid = async (orderIds: string[], clientId: string, totalAmount: number) => {
    try {
      await runTransaction(db, async (transaction) => {
        // READS
        const clientRef = doc(db, 'users', clientId);
        const clientSnap = await transaction.get(clientRef);
        
        const orderSnaps = [];
        for (const id of orderIds) {
          const oRef = doc(db, 'orders', id);
          orderSnaps.push({ ref: oRef, snap: await transaction.get(oRef) });
        }

        // WRITES
        for (const { ref, snap } of orderSnaps) {
          if (snap.exists() && snap.data().status !== 'paid') {
            transaction.update(ref, { status: 'paid' });
          }
        }

        if (clientSnap.exists()) {
          const currentDebt = clientSnap.data().debt || 0;
          transaction.update(clientRef, { debt: Math.max(0, currentDebt - totalAmount) });
        }
      });
      return true;
    } catch (e: any) {
      console.error("DEBUG PAYMENT ERROR:", e);
      throw new Error(e.message || "Error en transacción de pago");
    }
  };

  const addClient = async (client: { name: string, email: string, phone: string }) => {
    const newRef = doc(collection(db, 'users'));
    await setDoc(newRef, { ...client, uid: newRef.id, role: 'client', debt: 0 });
  };

  return { addProduct, updateProduct, deleteProduct, addOrder, addClient, markMultipleOrdersAsPaid };
};
