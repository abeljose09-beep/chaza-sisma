import React, { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useStore } from '../store/useStore';
import { useFirebase } from '../hooks/useFirebase';
import type { Order } from '../types';
import { CheckCircle, Clock, Receipt, Hash, History as HistoryIcon, Check, DollarSign } from 'lucide-react';

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<'pending' | 'all'>('pending');
  const [selectedOrders, setSelectedOrders] = useState<Record<string, Set<string>>>({});
  const [partialPayOrderId, setPartialPayOrderId] = useState<string | null>(null);
  const [partialAmount, setPartialAmount] = useState<string>('');
  const { clients, user } = useStore();
  const { markMultipleOrdersAsPaid, payPartialOrder } = useFirebase();

  useEffect(() => {
    let q;
    if (user?.role === 'client') {
      q = query(collection(db, 'orders'), where('clientId', '==', user.uid));
    } else {
      q = query(collection(db, 'orders'));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
      items.sort((a, b) => b.createdAt - a.createdAt);
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

  const clientGroups = filteredOrders.reduce((acc, order) => {
    if (!acc[order.clientId]) acc[order.clientId] = [];
    acc[order.clientId].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  const toggleOrderSelection = (clientId: string, orderId: string) => {
    setSelectedOrders(prev => {
      const copy = { ...prev };
      if (!copy[clientId]) copy[clientId] = new Set();
      const set = new Set(copy[clientId]);
      if (set.has(orderId)) {
        set.delete(orderId);
      } else {
        set.add(orderId);
      }
      copy[clientId] = set;
      return copy;
    });
  };

  const toggleAllForClient = (clientId: string, pendingOrders: Order[]) => {
    setSelectedOrders(prev => {
      const copy = { ...prev };
      const current = copy[clientId] || new Set();
      const allSelected = pendingOrders.every(o => current.has(o.id));
      if (allSelected) {
        copy[clientId] = new Set();
      } else {
        copy[clientId] = new Set(pendingOrders.map(o => o.id));
      }
      return copy;
    });
  };

  const getSelectedTotal = (clientId: string, clientOrders: Order[]) => {
    const sel = selectedOrders[clientId];
    if (!sel || sel.size === 0) return 0;
    return clientOrders.filter(o => sel.has(o.id) && o.status === 'pending').reduce((sum, o) => sum + (o.total - (o.paidAmount || 0)), 0);
  };

  const handlePaySelected = async (clientId: string, clientOrders: Order[]) => {
    const sel = selectedOrders[clientId];
    if (!sel || sel.size === 0) return alert("Selecciona al menos un pedido para pagar");

    const toPay = clientOrders.filter(o => sel.has(o.id) && o.status === 'pending');
    if (toPay.length === 0) return;

    const total = toPay.reduce((sum, o) => sum + (o.total - (o.paidAmount || 0)), 0);
    const msg = toPay.length === 1
      ? `¿Marcar el pedido #${toPay[0].orderNum || '--'} ($${total.toLocaleString()}) como pagado?`
      : `¿Marcar ${toPay.length} pedidos de ${getClientName(clientId)} ($${total.toLocaleString()}) como pagados?`;

    if (!confirm(msg)) return;

    try {
      await markMultipleOrdersAsPaid(toPay.map(o => o.id), clientId);
      setSelectedOrders(prev => ({ ...prev, [clientId]: new Set() }));
    } catch (error) {
      console.error(error);
      alert("Error al procesar el pago");
    }
  };

  const handlePartialPay = async (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    const amount = Number(partialAmount);
    const remaining = order.total - (order.paidAmount || 0);

    if (isNaN(amount) || amount <= 0) {
      return alert("Ingresa un monto válido mayor a 0.");
    }
    if (amount > remaining) {
      return alert(`El abono no puede superar la deuda actual de $${remaining.toLocaleString()}`);
    }

    try {
      await payPartialOrder(order.id, order.clientId, amount);
      setPartialPayOrderId(null);
      setPartialAmount('');
      alert("Abono guardado correctamente.");
    } catch (error) {
      console.error(error);
      alert("Error al guardar el abono.");
    }
  };

  return (
    <div className="orders-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>
          {isAtLeastAdmin ? 'Gestión de Cobros' : 'Mis Cuentas'}
        </h2>
        <div style={{ display: 'flex', gap: '0.2rem', background: 'var(--border)', padding: '0.2rem', borderRadius: '10px' }}>
          <button
            className={`btn ${view === 'pending' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
            onClick={() => setView('pending')}
          >
            <Clock size={14} /> Pendientes
          </button>
          <button
            className={`btn ${view === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
            onClick={() => setView('all')}
          >
            <HistoryIcon size={14} /> Historial
          </button>
        </div>
      </div>

      <div className="grid">
        {Object.entries(clientGroups).map(([clientId, clientOrders]) => {
          const pendingOrders = clientOrders.filter(o => o.status === 'pending');
          const totalPending = pendingOrders.reduce((sum, o) => sum + (o.total - (o.paidAmount || 0)), 0);
          const sel = selectedOrders[clientId] || new Set();
          const selectedTotal = getSelectedTotal(clientId, clientOrders);
          const allSelected = pendingOrders.length > 0 && pendingOrders.every(o => sel.has(o.id));

          return (
            <div key={clientId} className="card" style={{ padding: '1rem' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>{getClientName(clientId)}</h3>
                {totalPending > 0 ? (
                  <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>
                    ${totalPending.toLocaleString()}
                  </span>
                ) : (
                  <span className="badge" style={{ backgroundColor: '#dcfce7', color: '#10b981' }}>Al día</span>
                )}
              </div>

              {/* Select All (admin only, pending view) */}
              {isAtLeastAdmin && pendingOrders.length > 1 && view === 'pending' && (
                <button
                  onClick={() => toggleAllForClient(clientId, pendingOrders)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    fontSize: '0.75rem', color: 'var(--primary)', background: 'none',
                    border: 'none', cursor: 'pointer', marginBottom: '0.5rem', fontWeight: '600'
                  }}
                >
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '4px',
                    border: `2px solid ${allSelected ? 'var(--primary)' : 'var(--border)'}`,
                    background: allSelected ? 'var(--primary)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {allSelected && <Check size={12} color="white" />}
                  </div>
                  {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
              )}

              {/* Order List */}
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {clientOrders.map(order => {
                  const isPending = order.status === 'pending';
                  const isSelected = sel.has(order.id);

                  return (
                    <div
                      key={order.id}
                      onClick={() => {
                        if (isAtLeastAdmin && isPending) toggleOrderSelection(clientId, order.id);
                      }}
                      style={{
                        fontSize: '0.8rem',
                        marginBottom: '0.5rem',
                        padding: '0.65rem',
                        background: isSelected ? 'rgba(0, 159, 227, 0.08)' : isPending ? 'var(--background)' : 'rgba(142, 198, 63, 0.06)',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                        borderLeft: `4px solid ${order.status === 'paid' ? '#8ec63f' : '#ef4444'}`,
                        cursor: isAtLeastAdmin && isPending ? 'pointer' : 'default',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {/* Checkbox for admin on pending orders */}
                          {isAtLeastAdmin && isPending && (
                            <div style={{
                              width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                              border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                              background: isSelected ? 'var(--primary)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s'
                            }}>
                              {isSelected && <Check size={12} color="white" />}
                            </div>
                          )}
                          <span style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Hash size={12} />{order.orderNum || '--'}
                          </span>
                          <span style={{
                            fontSize: '0.6rem', fontWeight: '700', padding: '0.1rem 0.35rem', borderRadius: '6px',
                            background: isPending ? '#fee2e2' : '#dcfce7',
                            color: isPending ? '#ef4444' : '#10b981'
                          }}>
                            {isPending ? 'PEND' : 'PAGADO'}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>${(order.total - (order.paidAmount || 0)).toLocaleString()}</span>
                          {order.paidAmount ? (
                            <div style={{ fontSize: '0.65rem', color: '#10b981' }}>De ${order.total.toLocaleString()} (Abonado: ${order.paidAmount.toLocaleString()})</div>
                          ) : null}
                        </div>
                      </div>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {(order.items || []).map((item, i) => (
                           <span key={i}>{item.quantity}x {item.name}{i < (order.items || []).length - 1 ? ' · ' : ''}</span>
                        ))}
                      </div>
                      
                      {isAtLeastAdmin && isPending && !isSelected && (
                        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                          {partialPayOrderId === order.id ? (
                            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>$</span>
                              <input 
                                type="number" 
                                value={partialAmount} 
                                onChange={e => setPartialAmount(e.target.value)}
                                style={{ width: '80px', padding: '0.2rem', fontSize: '0.75rem', height: 'calc(1.5rem + 2px)' }}
                                placeholder="Monto"
                                autoFocus
                              />
                              <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', height: 'calc(1.5rem + 2px)' }} onClick={(e) => handlePartialPay(e, order)}>Ok</button>
                              <button className="btn btn-ghost" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', height: 'calc(1.5rem + 2px)' }} onClick={(e) => { e.stopPropagation(); setPartialPayOrderId(null); }}>X</button>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setPartialPayOrderId(order.id); setPartialAmount(''); }}
                              style={{ 
                                background: 'white', border: '1px solid var(--primary)', 
                                color: 'var(--primary)', padding: '0.2rem 0.6rem', 
                                borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                            >
                              <DollarSign size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }}/> Abonar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pay Button */}
              {isAtLeastAdmin && pendingOrders.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  {sel.size > 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '700', marginBottom: '0.5rem', textAlign: 'center' }}>
                      {sel.size} pedido{sel.size > 1 ? 's' : ''} seleccionado{sel.size > 1 ? 's' : ''}: ${selectedTotal.toLocaleString()}
                    </p>
                  )}
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.65rem', fontSize: '0.8rem' }}
                    onClick={() => handlePaySelected(clientId, clientOrders)}
                    disabled={sel.size === 0}
                  >
                    <CheckCircle size={16} />
                    {sel.size > 0
                      ? `Pagar Selección ($${selectedTotal.toLocaleString()})`
                      : 'Selecciona pedidos para pagar'
                    }
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Receipt size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p>No hay registros en esta vista.</p>
          </div>
        )}
      </div>
    </div>
  );
};
