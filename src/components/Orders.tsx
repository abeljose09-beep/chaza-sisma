import React, { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useStore } from '../store/useStore';
import { useFirebase } from '../hooks/useFirebase';
import type { Order } from '../types';
import { CheckCircle, Clock, Receipt, Hash, History } from 'lucide-react';

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<'pending' | 'all'>('pending');
  const { clients, user } = useStore();
  const { markMultipleOrdersAsPaid } = useFirebase();

  useEffect(() => {
    let q;
    if (user?.role === 'client') {
      q = query(
        collection(db, 'orders'), 
        where('clientId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc')
      );
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
      setOrders(items);
    }, (error) => {
        console.error("Orders sync error:", error);
    });
    return () => unsub();
  }, [user]);

  const getClientName = (id: string) => {
    if (id === user?.uid) return user.name;
    const client = clients.find(c => c.uid === id);
    return client ? client.name : 'Cliente Desconocido';
  };

  const isAtLeastAdmin = user?.role === 'admin' || user?.role === 'superuser';

  const filteredOrders = orders.filter(o => view === 'all' || o.status === 'pending');

  const clientTubs = filteredOrders.reduce((acc, order) => {
    if (!acc[order.clientId]) acc[order.clientId] = [];
    acc[order.clientId].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  const handlePayAll = async (clientId: string, clientOrders: Order[], total: number) => {
    const pendingOrders = clientOrders.filter(o => o.status === 'pending');
    if (pendingOrders.length === 0) return;

    if (!confirm(`¿Marcar todas las cuentas de ${getClientName(clientId)} ($${total.toLocaleString()}) como pagadas?`)) return;

    try {
      const orderIds = pendingOrders.map(o => o.id);
      await markMultipleOrdersAsPaid(orderIds, clientId, total);
      alert("Cuentas marcadas como pagadas correctamente");
    } catch (error) {
      console.error(error);
      alert("Error al procesar el pago");
    }
  };

  return (
    <div className="orders-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2>
          {isAtLeastAdmin ? 'Gestión de Cobros' : 'Mis Cuentas'}
        </h2>
        
        <div className="btn-group" style={{ display: 'flex', gap: '0.25rem', background: 'var(--border)', padding: '0.25rem', borderRadius: '12px' }}>
          <button 
            className={`btn ${view === 'pending' ? 'btn-primary' : 'btn-ghost'}`} 
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            onClick={() => setView('pending')}
          >
            <Clock size={16} /> Pendientes
          </button>
          <button 
            className={`btn ${view === 'all' ? 'btn-primary' : 'btn-ghost'}`} 
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            onClick={() => setView('all')}
          >
            <History size={16} /> Historial
          </button>
        </div>
      </div>

      <div className="grid">
        {Object.entries(clientTubs).map(([clientId, clientOrders]) => {
          const clientTotalPending = clientOrders.filter(o => o.status === 'pending').reduce((sum, o) => sum + o.total, 0);
          
          return (
            <div key={clientId} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {getClientName(clientId)}
                </h3>
                {clientTotalPending > 0 && (
                  <span className="badge" style={{ backgroundColor: '#fff7ed', color: '#c2410c' }}>
                    Deuda: ${clientTotalPending.toLocaleString()}
                  </span>
                )}
              </div>

              <div style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '1rem' }}>
                {clientOrders.map(order => (
                  <div key={order.id} style={{ 
                    fontSize: '0.85rem', 
                    marginBottom: '1rem', 
                    padding: '0.75rem', 
                    background: 'var(--background)', 
                    borderRadius: '8px',
                    borderLeft: `4px solid ${order.status === 'paid' ? 'var(--secondary)' : 'var(--danger)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Hash size={14} /> {order.orderNum || '--'}
                        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                          ({order.status === 'paid' ? 'PAGADO' : 'PENDIENTE'})
                        </span>
                      </span>
                      <span>${order.total.toLocaleString()}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                    <ul style={{ listStyle: 'none', paddingLeft: '0.5rem', borderLeft: '2px solid var(--border)' }}>
                      {order.items.map((item, idx) => (
                        <li key={idx} style={{ fontSize: '0.8rem' }}>{item.quantity}x {item.name}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {clientTotalPending > 0 && isAtLeastAdmin && (
                <div style={{ borderTop: '2px solid var(--border)', paddingTop: '1rem' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', background: 'var(--secondary)' }}
                    onClick={() => handlePayAll(clientId, clientOrders, clientTotalPending)}
                  >
                    <CheckCircle size={18} /> Marcar todo como Pagado
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {filteredOrders.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <Receipt size={60} style={{ margin: '0 auto 1.5rem', opacity: 0.2 }} />
            <p>No se encontraron registros en esta vista.</p>
          </div>
        )}
      </div>
    </div>
  );
};
