import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useFirebase } from '../hooks/useFirebase';
import { UserPlus, Phone, Mail, History } from 'lucide-react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Order } from '../types';

export const Clients: React.FC = () => {
  const { clients } = useStore();
  const { addClient } = useFirebase();
  const [showAdd, setShowAdd] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' });
  const [historyClientId, setHistoryClientId] = useState<string | null>(null);
  const [clientHistory, setClientHistory] = useState<Order[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addClient(newClient);
    setNewClient({ name: '', email: '', phone: '' });
    setShowAdd(false);
  };

  const fetchHistory = async (clientId: string) => {
    setLoadingHistory(true);
    setHistoryClientId(clientId);
    try {
      const q = query(
        collection(db, 'orders'), 
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
      setClientHistory(history);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
    setLoadingHistory(false);
  };

  return (
    <div className="clients-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h2>Directorio de Clientes</h2>
        {!historyClientId && (
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
            <UserPlus size={20} /> Nuevo Cliente
          </button>
        )}
        {historyClientId && (
          <button className="btn btn-ghost" onClick={() => setHistoryClientId(null)}>
            Volver al listado
          </button>
        )}
      </div>

      {!historyClientId && showAdd && (
        <form className="card animate-fade-in" onSubmit={handleAdd} style={{ marginBottom: '2rem' }}>
          <div className="grid">
            <div>
              <label>Nombre Completo</label>
              <input 
                required 
                value={newClient.name} 
                onChange={e => setNewClient({...newClient, name: e.target.value})}
              />
            </div>
            <div>
              <label>Correo Electrónico</label>
              <input 
                type="email"
                required 
                value={newClient.email} 
                onChange={e => setNewClient({...newClient, email: e.target.value})}
              />
            </div>
            <div>
              <label>Teléfono (Opcional)</label>
              <input 
                placeholder="Ej: 3001234567"
                value={newClient.phone} 
                onChange={e => setNewClient({...newClient, phone: e.target.value})}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Registrar</button>
        </form>
      )}

      {historyClientId ? (
        <div className="card animate-fade-in">
          <h3>Historial de Pedidos: {clients.find(c => c.uid === historyClientId)?.name}</h3>
          <div style={{ marginTop: '1.5rem' }}>
            {loadingHistory ? (
              <p>Cargando historial...</p>
            ) : clientHistory.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Este cliente no tiene pedidos registrados.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {clientHistory.map(order => (
                  <div key={order.id} style={{ padding: '1rem', background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 'bold' }}>Pedido #{order.orderNum || 'S/N'}</span>
                      <span className={`badge ${order.status === 'paid' ? 'success' : 'danger'}`} style={{
                        backgroundColor: order.status === 'paid' ? '#dcfce7' : '#fee2e2',
                        color: order.status === 'paid' ? '#10b981' : '#ef4444'
                      }}>
                        {order.status === 'paid' ? 'Pagado' : 'Pendiente'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span>{new Date(order.createdAt).toLocaleString()}</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>${order.total.toLocaleString()}</span>
                    </div>
                    <ul style={{ listStyle: 'none', paddingLeft: '0.5rem', borderLeft: '2px solid var(--border)', fontSize: '0.85rem' }}>
                      {order.items.map((item, idx) => (
                        <li key={idx}>{item.quantity}x {item.name}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid">
          {clients.map(client => (
            <div key={client.uid} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ marginBottom: '0.5rem' }}>{client.name}</h3>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <Mail size={14} /> {client.email}
                  </p>
                  {client.phone && (
                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                      <Phone size={14} /> {client.phone}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Deuda Actual</p>
                  <p style={{ fontWeight: 'bold', fontSize: '1.2rem', color: (client.debt || 0) > 0 ? 'var(--danger)' : 'var(--secondary)' }}>
                    ${(client.debt || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-ghost" style={{ flex: 1, fontSize: '0.85rem' }} onClick={() => fetchHistory(client.uid)}>
                  <History size={16} /> Ver Historial
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
