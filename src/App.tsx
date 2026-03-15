import React, { useState, useEffect } from 'react';
import { Users, Package, ShoppingCart, Receipt, TrendingUp, Sun, Moon } from 'lucide-react';
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
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );
  const { user } = useStore();
  
  // Initialize Firebase sync
  useFirebase();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  if (!user) {
    return (
      <div className="app-container">
        <div style={{ position: 'fixed', top: '1rem', right: '1rem' }}>
          <button className="btn btn-ghost" onClick={toggleTheme} style={{ padding: '0.5rem' }}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: '3rem', marginBottom: '1rem' }}>
          <img src="/logo.png" alt="Logo" className="logo-img" style={{ height: '70px', marginBottom: '0.5rem' }} />
          <h1 className="logo-title" style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>Chaza Sisma</h1>
        </div>
        <Login />
      </div>
    );
  }

  const isAtLeastAdmin = user.role === 'admin' || user.role === 'superuser';

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem 0' }}>
        <button className="btn btn-ghost" onClick={toggleTheme} style={{ marginRight: '0.5rem' }}>
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <Login />
      </header>

      <nav className="nav animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.png" alt="Logo" className="logo-img" style={{ height: '36px' }} />
          <h1 className="logo-title" style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0 }}>Chaza Sisma</h1>
        </div>
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
            <Receipt size={18} /> <span className="hide-mobile">{isAtLeastAdmin ? 'Cuentas' : 'Mis Cuentas'}</span>
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
          .nav { flex-direction: column; gap: 1.5rem; align-items: center; text-align: center; }
          .btn { flex: 1; padding: 0.6rem; }
        }
      `}</style>
    </div>
  );
};

export default App;
