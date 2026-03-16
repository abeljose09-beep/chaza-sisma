import React, { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { TrendingUp, DollarSign, Package, Calendar } from 'lucide-react';
import type { Order } from '../types';

export const Reports: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [timeframe, setTimeframe] = useState<'today' | 'week'>('today');

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
    const weekAgo = todayStart - (7 * 24 * 60 * 60 * 1000);
    return order.createdAt >= weekAgo;
  });

  const stats = {
    totalRevenue: filteredOrders.reduce((sum, o) => sum + o.total, 0),
    totalOrders: filteredOrders.length,
    pendingCollection: filteredOrders.filter(o => o.status === 'pending').reduce((sum, o) => sum + o.total, 0),
    paidRevenue: filteredOrders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.total, 0)
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

  return (
    <div className="reports-section animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Reportes de Ventas</h2>
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
        </div>
      </div>

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
