import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useFirebase } from '../hooks/useFirebase';
import { UserPlus, Phone, CreditCard, Mail } from 'lucide-react';

export const Clients: React.FC = () => {
  const { clients } = useStore();
  const { addClient } = useFirebase();
  const [showAdd, setShowAdd] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addClient(newClient);
    setNewClient({ name: '', email: '', phone: '' });
    setShowAdd(false);
  };

  return (
    <div className="clients-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h2>Directorio de Clientes</h2>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          <UserPlus size={20} /> Nuevo Cliente
        </button>
      </div>

      {showAdd && (
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
                <p style={{ fontWeight: 'bold', color: client.debt > 0 ? 'var(--danger)' : 'var(--secondary)' }}>
                  ${(client.debt || 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: '0.85rem' }}>
                <CreditCard size={16} /> Ver Historial
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
