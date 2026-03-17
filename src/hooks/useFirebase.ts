import { useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, setDoc, deleteDoc, runTransaction, where, getDocs, writeBatch } from 'firebase/firestore';
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

  const deleteOrder = async (orderId: string, clientId: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', orderId);
        const clientRef = doc(db, 'users', clientId);
        
        const orderSnap = await transaction.get(orderRef);
        const clientSnap = await transaction.get(clientRef);

        if (orderSnap.exists()) {
          const orderData = orderSnap.data();
          const pendingDebt = orderData.status === 'pending' ? (orderData.total - (orderData.paidAmount || 0)) : 0;
          
          // Leer productos para restaurar stock
          const items = orderData.items || [];
          const productSnaps = [];
          for (const item of items) {
            const pRef = doc(db, 'products', item.id);
            productSnaps.push({ ref: pRef, snap: await transaction.get(pRef), qty: item.quantity });
          }

          transaction.delete(orderRef);

          if (pendingDebt > 0 && clientSnap.exists()) {
            const currentDebt = clientSnap.data().debt || 0;
            transaction.update(clientRef, { debt: Math.max(0, currentDebt - pendingDebt) });
          }

          // Restaurar stock de los items borrados
          for (const { ref, snap, qty } of productSnaps) {
            if (snap.exists()) {
              const currentStock = snap.data().stock || 0;
              transaction.update(ref, { stock: currentStock + qty });
            }
          }
        }
      });
      return true;
    } catch (e: any) {
      console.error("DEBUG DELETE ORDER ERROR:", e);
      throw new Error(e.message || "Error al eliminar pedido");
    }
  };

  const markMultipleOrdersAsPaid = async (orderIds: string[], clientId: string) => {
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
        let totalToDiscount = 0;
        for (const { ref, snap } of orderSnaps) {
          if (snap.exists() && snap.data().status !== 'paid') {
            const data = snap.data();
            const remaining = data.total - (data.paidAmount || 0);
            totalToDiscount += remaining;
            transaction.update(ref, { status: 'paid', paidAmount: data.total });
          }
        }

        if (clientSnap.exists()) {
          const currentDebt = clientSnap.data().debt || 0;
          transaction.update(clientRef, { debt: Math.max(0, currentDebt - totalToDiscount) });
        }
      });
      return true;
    } catch (e: any) {
      console.error("DEBUG PAYMENT ERROR:", e);
      throw new Error(e.message || "Error en transacción de pago");
    }
  };

  const payPartialOrder = async (orderId: string, clientId: string, amount: number) => {
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', orderId);
        const clientRef = doc(db, 'users', clientId);
        
        const orderSnap = await transaction.get(orderRef);
        const clientSnap = await transaction.get(clientRef);

        if (!orderSnap.exists()) throw new Error("Pedido no encontrado");
        const orderData = orderSnap.data();
        
        if (orderData.status === 'paid') throw new Error("Pedido ya está pagado");

        const currentPaid = orderData.paidAmount || 0;
        const remaining = orderData.total - currentPaid;
        
        if (amount > remaining) throw new Error("El abono no puede superar la deuda actual de este pedido");

        const newPaidAmount = currentPaid + amount;
        if (newPaidAmount >= orderData.total) {
          transaction.update(orderRef, { status: 'paid', paidAmount: orderData.total });
        } else {
          transaction.update(orderRef, { paidAmount: newPaidAmount });
        }

        if (clientSnap.exists()) {
          const currentDebt = clientSnap.data().debt || 0;
          transaction.update(clientRef, { debt: Math.max(0, currentDebt - amount) });
        }
      });
      return true;
    } catch (e: any) {
      console.error("DEBUG ABONO ERROR:", e);
      throw new Error(e.message || "Error al realizar abono");
    }
  };

  const addClient = async (client: { name: string, email: string, phone: string }) => {
    const newRef = doc(collection(db, 'users'));
    await setDoc(newRef, { ...client, uid: newRef.id, role: 'client', debt: 0 });
  };

  const resetAllDebts = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'client'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => {
        batch.update(doc(db, 'users', d.id), { debt: 0 });
      });
      await batch.commit();
      return true;
    } catch (e: any) {
      console.error('DEBUG RESET DEBTS ERROR:', e);
      throw new Error(e.message || 'Error al resetear saldos');
    }
  };

  const deleteAllOrders = async () => {
    try {
      // 1. Borrar todos los pedidos en batches
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const orderDocs = ordersSnap.docs;
      const BATCH_SIZE = 400;
      for (let i = 0; i < orderDocs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        orderDocs.slice(i, i + BATCH_SIZE).forEach(d => {
          batch.delete(doc(db, 'orders', d.id));
        });
        await batch.commit();
      }

      // 2. Resetear todas las deudas a 0
      const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'client')));
      if (usersSnap.docs.length > 0) {
        const batch = writeBatch(db);
        usersSnap.docs.forEach(d => {
          batch.update(doc(db, 'users', d.id), { debt: 0 });
        });
        await batch.commit();
      }

      // 3. Resetear contador de pedidos
      const counterRef = doc(db, 'metadata', 'orderCounter');
      await setDoc(counterRef, { count: 0 }, { merge: true });

      return true;
    } catch (e: any) {
      console.error('DEBUG DELETE ALL ORDERS ERROR:', e);
      throw new Error(e.message || 'Error al borrar pedidos');
    }
  };

  return { addProduct, updateProduct, deleteProduct, addOrder, addClient, markMultipleOrdersAsPaid, deleteOrder, resetAllDebts, deleteAllOrders, payPartialOrder };
};
