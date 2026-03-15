import React, { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useStore } from '../store/useStore';
import { useFirebase } from '../hooks/useFirebase';
import type { Order } from '../types';
import { CheckCircle, Clock, Receipt, Hash } from 'lucide-react';

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const { clients, user } = useStore();
  const { markOrderAsPaid } = useFirebase();

  useEffect(() => {
    let q = query(collection(db, 'orders'), where('status', '==', 'pending'));
    
    if (user?.role === 'client') {
      q = query(collection(db, 'orders'), 
        where('status', '==', 'pending'),
        where('clientId', '==', user.uid)
      );
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
      setOrders(items);
    });
    return () => unsub();
  }, [user]);

  const getClientName = (id: string) => {
    if (id === user?.uid) return user.name;
    const client = clients.find(c => c.uid === id);
    return client ? client.name : 'Cliente Desconocido';
  };

  const isAtLeastAdmin = user?.role === 'admin' || user?.role === 'superuser';

  const clientTubs = orders.reduce((acc, order) => {
    if (!acc[order.clientId]) acc[order.clientId] = [];
    acc[order.clientId].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  return (
    <div className="orders-section">
      <h2 style={{ marginBottom: '1.5rem' }}>
        {isAtLeastAdmin ? 'Gestión de Cobros' : 'Mis Cuentas Pendientes'}
      </h2>

      <div className="grid">
        {Object.entries(clientTubs).map(([clientId, clientOrders]) => {
          const clientTotal = clientOrders.reduce((sum, o) => sum + o.total, 0);
          return (
            <div key={clientId} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={20} color="var(--primary)" /> {getClientName(clientId)}
                </h3>
                <span className="badge" style={{ backgroundColor: '#fff7ed', color: '#c2410c' }}>
                  Pendiente
                </span>
              </div>

              <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '1rem' }}>
                {clientOrders.sort((a,b) => (b.orderNum || 0) - (a.orderNum || 0)).map(order => (
                  <div key={order.id} style={{ fontSize: '0.85rem', marginBottom: '1rem', padding: '0.75rem', background: 'var(--background)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Hash size={14} /> {order.orderNum || 'S/N'}
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

              <div style={{ borderTop: '2px solid var(--border)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <p style={{ fontWeight: 'bold' }}>Total Deuda</p>
                  <p style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--danger)' }}>
                    ${clientTotal.toLocaleString()}
                  </p>
                </div>
                
                {isAtLeastAdmin && (
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', background: 'var(--secondary)' }}
                    onClick={async () => {
                      if (confirm(`¿Marcar todas las cuentas de ${getClientName(clientId)} ($${clientTotal.toLocaleString()}) como pagadas?`)) {
                        for (const o of clientOrders) {
                          await markOrderAsPaid(o.id, clientId, o.total);
                        }
                      }
                    }}
                  >
                    <CheckCircle size={18} /> Marcar todo como Pagado
                  </button>
                )}

                {!isAtLeastAdmin && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Por favor, contacta al administrador para pagar su cuenta.
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {orders.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <Receipt size={60} style={{ margin: '0 auto 1.5rem', opacity: 0.2 }} />
            <p>{isAtLeastAdmin ? 'No hay cuentas pendientes de cobro' : 'No tienes cuentas pendientes. ¡Estás al día!'}</p>
          </div>
        )}
      </div>
    </div>
  );
};
