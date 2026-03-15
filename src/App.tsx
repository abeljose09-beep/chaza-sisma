import React, { useState } from 'react';
import { Layout, Users, Package, ShoppingCart, Receipt } from 'lucide-react';
import { Inventory } from './Inventory';
import { Clients } from './Clients';
import { POS } from './POS';
import { Orders } from './Orders';
import '../styles/main.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'clients' | 'orders'>('pos');

  return (
    <div className="app-container">
      <nav className="nav animate-fade-in">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>Chaza Sisma</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${activeTab === 'pos' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('pos')}
          >
            <ShoppingCart size={20} /> <span className="hide-mobile">Ventas</span>
          </button>
          <button 
            className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Package size={20} /> <span className="hide-mobile">Inventario</span>
          </button>
          <button 
            className={`btn ${activeTab === 'clients' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('clients')}
          >
            <Users size={20} /> <span className="hide-mobile">Clientes</span>
          </button>
          <button 
            className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('orders')}
          >
            <Receipt size={20} /> <span className="hide-mobile">Cuentas</span>
          </button>
        </div>
      </nav>

      <main className="animate-fade-in" style={{ flex: 1 }}>
        {activeTab === 'pos' && <POS />}
        {activeTab === 'inventory' && <Inventory />}
        {activeTab === 'clients' && <Clients />}
        {activeTab === 'orders' && <Orders />}
      </main>

      <style>{`
        @media (max-width: 640px) {
          .hide-mobile { display: none; }
          .nav { flex-direction: column; gap: 1rem; }
        }
      `}</style>
    </div>
  );
};

export default App;
