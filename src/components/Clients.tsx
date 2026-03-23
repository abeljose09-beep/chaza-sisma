import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useFirebase } from '../hooks/useFirebase';
import { UserPlus, Phone, Mail, History, Trash2, Pencil, X, Check } from 'lucide-react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Order } from '../types';

export const Clients: React.FC = () => {
  const { clients, user } = useStore();
  const { addClient, deleteOrder, resetAllDebts, updateClient } = useFirebase();
  const [showAdd, setShowAdd] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' });
  const [historyClientId, setHistoryClientId] = useState<string | null>(null);
  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<string | null>(null);
  const [clientHistory, setClientHistory] = useState<Order[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // Edición inline
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addClient(newClient);
    setNewClient({ name: '', email: '', phone: '' });
    setShowAdd(false);
  };

  const startEdit = (client: typeof clients[0]) => {
    setEditingClientId(client.uid);
    setEditForm({ name: client.name, email: client.email, phone: client.phone || '' });
  };

  const cancelEdit = () => {
    setEditingClientId(null);
    setEditForm({ name: '', email: '', phone: '' });
  };

  const handleSaveEdit = async (uid: string) => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      return alert('El nombre y correo son obligatorios.');
    }
    setSavingEdit(true);
    try {
      await updateClient(uid, editForm);
      cancelEdit();
    } catch (err) {
      alert('Error al guardar los cambios.');
      console.error(err);
    }
    setSavingEdit(false);
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

  const handleDeleteOrder = async (order: Order) => {
    try {
      await deleteOrder(order.id, order.clientId);
      setClientHistory(prev => prev.filter(o => o.id !== order.id));
      setConfirmDeleteOrderId(null);
    } catch (error) {
      alert('Error al eliminar el pedido. Inténtalo de nuevo.');
      console.error(error);
    }
  };

  const handleResetAllDebts = async () => {
    try {
      await resetAllDebts();
      setConfirmReset(false);
      alert('Saldos reseteados a $0 correctamente.');
    } catch (error) {
      alert('Error al resetear saldos.');
      console.error(error);
    }
  };

  const isSuperuser = user?.role === 'superuser';

  return (
    <div className="clients-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2>Directorio de Clientes</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {isSuperuser && !historyClientId && (
            confirmReset ? (
              <div style={{ display: 'flex', gap: '0.25rem', background: '#fee2e2', padding: '0.2rem 0.5rem', borderRadius: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold' }}>¿Confirmar reset $0?</span>
                <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: '#ef4444', border: 'none' }} onClick={handleResetAllDebts}>Sí</button>
                <button className="btn btn-ghost" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setConfirmReset(false)}>No</button>
              </div>
            ) : (
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.8rem', color: '#ef4444', borderColor: '#ef4444' }}
                onClick={() => setConfirmReset(true)}
              >
                Resetear saldos a $0
              </button>
            )
          )}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`badge ${order.status === 'paid' ? 'success' : 'danger'}`} style={{
                          backgroundColor: order.status === 'paid' ? '#dcfce7' : '#fee2e2',
                          color: order.status === 'paid' ? '#10b981' : '#ef4444'
                        }}>
                          {order.status === 'paid' ? 'Pagado' : 'Pendiente'}
                        </span>
                        {isSuperuser && (
                          confirmDeleteOrderId === order.id ? (
                            <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>¿Borrar?</span>
                              <button style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '0.1rem 0.3rem', cursor: 'pointer' }} onClick={() => handleDeleteOrder(order)}>Sí</button>
                              <button style={{ background: '#ccc', color: 'black', border: 'none', borderRadius: '4px', padding: '0.1rem 0.3rem', cursor: 'pointer' }} onClick={() => setConfirmDeleteOrderId(null)}>No</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteOrderId(order.id)}
                              title="Eliminar pedido"
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#ef4444', padding: '0.2rem', display: 'flex',
                                alignItems: 'center', borderRadius: '4px'
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span>{new Date(order.createdAt).toLocaleString()}</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>${order.total.toLocaleString()}</span>
                        {order.paidAmount ? (
                          <div style={{ fontSize: '0.7rem', color: '#10b981' }}>Abonado: ${order.paidAmount.toLocaleString()}</div>
                        ) : null}
                      </div>
                    </div>
                    <ul style={{ listStyle: 'none', paddingLeft: '0.5rem', borderLeft: '2px solid var(--border)', fontSize: '0.85rem' }}>
                      {(order.items || []).map((item, idx) => (
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
              {editingClientId === client.uid ? (
                /* ===== MODO EDICIÓN ===== */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <p style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--primary)' }}>Editando cliente</p>
                    <button onClick={cancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Nombre</label>
                      <input
                        value={editForm.name}
                        onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Nombre completo"
                        style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Correo</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                        placeholder="correo@ejemplo.com"
                        style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Teléfono WhatsApp</label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="Ej: 3001234567"
                        style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <button
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                        onClick={() => handleSaveEdit(client.uid)}
                        disabled={savingEdit}
                      >
                        <Check size={15} /> {savingEdit ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={cancelEdit}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ===== MODO VISTA ===== */
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ marginBottom: '0.35rem', fontSize: '1rem' }}>{client.name}</h3>
                      <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        <Mail size={13} /> {client.email}
                      </p>
                      {client.phone ? (
                        <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#25D366', fontSize: '0.82rem', marginTop: '4px', fontWeight: '600' }}>
                          <Phone size={13} /> {client.phone}
                        </p>
                      ) : (
                        <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', fontStyle: 'italic' }}>
                          <Phone size={12} /> Sin teléfono registrado
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.5rem' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deuda</p>
                      <p style={{ fontWeight: 'bold', fontSize: '1.1rem', color: (client.debt || 0) > 0 ? 'var(--danger)' : 'var(--secondary)' }}>
                        ${(client.debt || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="btn btn-ghost"
                      style={{ flex: 1, fontSize: '0.78rem', padding: '0.5rem' }}
                      onClick={() => fetchHistory(client.uid)}
                    >
                      <History size={14} /> Historial
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ flex: 1, fontSize: '0.78rem', padding: '0.5rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                      onClick={() => startEdit(client)}
                    >
                      <Pencil size={14} /> Editar
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
