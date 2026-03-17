import React, { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { TrendingUp, DollarSign, Package, Calendar, Printer, Wallet } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useFirebase } from '../hooks/useFirebase';
import type { Order } from '../types';

export const Reports: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const { user, products } = useStore();
  const { resetAllDebts, deleteAllOrders } = useFirebase();

  // Build a quick lookup map: productId -> current cost
  const productCostMap = Object.fromEntries(products.map(p => [p.id, p.cost || 0]));

  useEffect(() => {
    const q = query(collection(db, 'orders'));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
      items.sort((a, b) => b.createdAt - a.createdAt);
      setOrders(items);
    });
    return () => unsub();
  }, []);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const filteredOrders = orders.filter(order => {
    if (timeframe === 'today') return order.createdAt >= todayStart;
    if (timeframe === 'week') return order.createdAt >= todayStart - (7 * 24 * 60 * 60 * 1000);
    if (timeframe === 'month') return order.createdAt >= todayStart - (30 * 24 * 60 * 60 * 1000);
    
    if (timeframe === 'custom') {
      let isValid = true;
      if (startDate) {
        const startTimestamp = new Date(startDate).getTime();
        if (order.createdAt < startTimestamp) isValid = false;
      }
      if (endDate) {
        const endTimestamp = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1; // End of selected day
        if (order.createdAt > endTimestamp) isValid = false;
      }
      return isValid;
    }
    return true;
  });

  const totalCost = filteredOrders.reduce((sum, o) => {
    return sum + (o.items || []).reduce((itemSum, item) => {
      // Prefer cost stored at time of order; fall back to current product cost for legacy orders
      const unitCost = item.cost || productCostMap[item.id] || 0;
      return itemSum + (unitCost * item.quantity);
    }, 0);
  }, 0);

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const profitMargin = totalRevenue > 0 ? (((totalRevenue - totalCost) / totalRevenue) * 100).toFixed(1) : '0.0';

  const stats = {
    totalRevenue,
    totalOrders: filteredOrders.length,
    pendingCollection: filteredOrders.filter(o => o.status === 'pending').reduce((sum, o) => sum + (o.total - (o.paidAmount || 0)), 0),
    paidRevenue: filteredOrders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.total, 0) + filteredOrders.filter(o => o.status === 'pending').reduce((sum, o) => sum + (o.paidAmount || 0), 0),
    totalCost,
    totalProfit: totalRevenue - totalCost,
    profitMargin
  };

  // Calculate most sold products
  const productSales: Record<string, number> = {};
  filteredOrders.forEach(order => {
    (order.items || []).forEach(item => {
      productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
    });
  });

  const topProducts = Object.entries(productSales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const isSuperuser = user?.role === 'superuser';

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
  const handleDeleteAllOrders = async () => {
    try {
      await deleteAllOrders();
      setConfirmDelete(false);
      alert('Todos los pedidos fueron eliminados exitosamente.');
    } catch (error) {
      alert('Error al borrar los pedidos.');
      console.error(error);
    }
  };

  return (
    <div className="reports-section animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2>Reportes de Ventas</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {isSuperuser && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {confirmDelete ? (
                <div style={{ display: 'flex', gap: '0.25rem', background: '#fee2e2', padding: '0.2rem 0.5rem', borderRadius: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold' }}>¿Confirmar borrar todo?</span>
                  <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: '#ef4444', border: 'none' }} onClick={handleDeleteAllOrders}>Sí</button>
                  <button className="btn btn-ghost" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setConfirmDelete(false)}>No</button>
                </div>
              ) : (
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: '0.8rem', color: '#ef4444', borderColor: '#ef4444' }}
                  onClick={() => setConfirmDelete(true)}
                >
                  Borrar historial de ventas
                </button>
              )}

              {confirmReset ? (
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
              )}
            </div>
          )}
          <div className="btn-group" style={{ display: 'flex', gap: '0.25rem', background: 'var(--border)', padding: '0.25rem', borderRadius: '12px' }}>
            <button 
              className={`btn ${timeframe === 'today' ? 'btn-primary' : 'btn-ghost'}`} 
              style={{ padding: '0.5rem 1rem' }}
              onClick={() => setTimeframe('today')}
            >
              Hoy
            </button>
            <button 
              className={`btn ${timeframe === 'week' ? 'btn-primary' : 'btn-ghost'}`} 
              style={{ padding: '0.5rem 1rem' }}
              onClick={() => setTimeframe('week')}
            >
              Semana
            </button>
            <button 
              className={`btn ${timeframe === 'month' ? 'btn-primary' : 'btn-ghost'}`} 
              style={{ padding: '0.5rem 1rem' }}
              onClick={() => setTimeframe('month')}
            >
              Mes
            </button>
            <button 
              className={`btn ${timeframe === 'custom' ? 'btn-primary' : 'btn-ghost'}`} 
              style={{ padding: '0.5rem 1rem' }}
              onClick={() => setTimeframe('custom')}
            >
              Rango
            </button>
          </div>
          <button
            className="btn btn-primary print-hide"
            style={{ padding: '0.5rem 1rem', background: '#002d4b' }}
            onClick={() => window.print()}
          >
            <Printer size={16} /> PDF
          </button>
        </div>
      </div>

      {timeframe === 'custom' && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: 'var(--surface)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }} className="print-hide">
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Desde:</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Hasta:</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#eef2ff', padding: '0.75rem', borderRadius: '12px', color: 'var(--primary)' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ventas Totales</p>
              <h3 style={{ fontSize: '1.5rem' }}>${stats.totalRevenue.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '12px', color: 'var(--secondary)' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Dinero Recaudado</p>
              <h3 style={{ fontSize: '1.5rem' }}>${stats.paidRevenue.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: '12px', color: 'var(--danger)' }}>
              <Calendar size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Por Cobrar</p>
              <h3 style={{ fontSize: '1.5rem' }}>${stats.pendingCollection.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#ede9fe', padding: '0.75rem', borderRadius: '12px', color: '#8b5cf6' }}>
              <Wallet size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ganancia Neta</p>
              <h3 style={{ fontSize: '1.5rem', color: stats.totalProfit >= 0 ? '#8b5cf6' : '#ef4444' }}>
                ${stats.totalProfit.toLocaleString()}
              </h3>
              {totalCost > 0 && (
                <p style={{ fontSize: '0.75rem', fontWeight: 'bold', marginTop: '0.1rem', color: stats.totalProfit >= 0 ? '#10b981' : '#ef4444' }}>
                  Margen: {stats.profitMargin}%
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={20} /> Artículos Más Vendidos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topProducts.map(([name, qty], idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>{name}</span>
                  <span style={{ fontWeight: 'bold' }}>{qty} uds</span>
                </div>
                <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    background: 'var(--primary)', 
                    width: `${(qty / topProducts[0][1]) * 100}%`,
                    transition: 'width 0.5s ease-out'
                  }} />
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No hay ventas registradas en este periodo.</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Resumen de Actividad</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '8px', background: 'var(--background)' }}>
              <span>Total Pedidos:</span>
              <span style={{ fontWeight: 'bold' }}>{stats.totalOrders}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '8px', background: 'var(--background)' }}>
              <span>Promedio por Pedido:</span>
              <span style={{ fontWeight: 'bold' }}>
                ${stats.totalOrders > 0 ? Math.round(stats.totalRevenue / stats.totalOrders).toLocaleString() : 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 800px) {
          .reports-section .grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};
