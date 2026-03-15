import React, { useState } from 'react';
import { Users, Package, ShoppingCart, Receipt, TrendingUp } from 'lucide-react';
import { Inventory } from './components/Inventory';
import { Clients } from './components/Clients';
import { POS } from './components/POS';
import { Orders } from './components/Orders';
import { Login } from './components/Login';
import { Reports } from './components/Reports';
import { useStore } from './store/useStore';
import { useFirebase } from './hooks/useFirebase';
import './styles/main.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'clients' | 'orders' | 'reports'>('pos');
  const { user } = useStore();
  
  // Initialize Firebase sync
  useFirebase();

  if (!user) {
    return (
      <div className="app-container">
        <h1 style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--primary)' }}>Chaza Sisma</h1>
        <Login />
      </div>
    );
  }

  const isAtLeastAdmin = user.role === 'admin' || user.role === 'superuser';

  return (
    <div className="app-container">
      <header style={{ marginBottom: '1.5rem' }}>
        <Login />
      </header>

      <nav className="nav animate-fade-in">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>Chaza Sisma</h1>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${activeTab === 'pos' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('pos')}
          >
            <ShoppingCart size={18} /> <span className="hide-mobile">Comprar</span>
          </button>
          
          <button 
            className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Package size={18} /> <span className="hide-mobile">Inventario</span>
          </button>

          <button 
            className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('orders')}
          >
            <Receipt size={18} /> <span className="hide-mobile">Mis Cuentas</span>
          </button>

          {isAtLeastAdmin && (
            <>
              <button 
                className={`btn ${activeTab === 'clients' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('clients')}
              >
                <Users size={18} /> <span className="hide-mobile">Clientes</span>
              </button>
              <button 
                className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('reports')}
              >
                <TrendingUp size={18} /> <span className="hide-mobile">Informes</span>
              </button>
            </>
          )}
        </div>
      </nav>

      <main className="animate-fade-in" style={{ flex: 1 }}>
        {activeTab === 'pos' && <POS />}
        {activeTab === 'inventory' && <Inventory />}
        {activeTab === 'clients' && <Clients />}
        {activeTab === 'orders' && <Orders />}
        {activeTab === 'reports' && <Reports />}
      </main>

      <style>{`
        @media (max-width: 640px) {
          .hide-mobile { display: none; }
          .nav { flex-direction: column; gap: 1rem; align-items: stretch; }
          .btn { flex: 1; padding: 0.5rem; }
        }
      `}</style>
    </div>
  );
};

export default App;
