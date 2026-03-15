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
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem' }}>
          <button className="btn btn-ghost" onClick={toggleTheme} style={{ padding: '0.75rem', borderRadius: '50%' }}>
            {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: '4rem', marginBottom: '2rem' }}>
          <img 
            src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'} 
            alt="Chaza Logo" 
            className="logo-img" 
            style={{ height: '120px', maxWidth: '90%', objectFit: 'contain', filter: 'drop-shadow(0 8px 24px rgba(0,45,75,0.15))' }} 
          />
        </div>
        <Login />
      </div>
    );
  }

  const isAtLeastAdmin = user.role === 'admin' || user.role === 'superuser';

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 0', alignItems: 'center', gap: '1rem' }}>
        <button className="btn btn-ghost" onClick={toggleTheme} style={{ padding: '0.5rem', borderRadius: '50%' }}>
          {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
        </button>
        <Login />
      </header>

      <nav className="nav animate-fade-in" style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '24px', marginBottom: '2rem', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img 
            src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'} 
            alt="Logo" 
            className="logo-img" 
            style={{ height: '48px', objectFit: 'contain' }} 
          />
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
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

      <main className="animate-fade-in" style={{ flex: 1, paddingBottom: '3rem' }}>
        {activeTab === 'pos' && <POS />}
        {activeTab === 'inventory' && <Inventory />}
        {activeTab === 'clients' && <Clients />}
        {activeTab === 'orders' && <Orders />}
        {activeTab === 'reports' && <Reports />}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none; }
          .nav { flex-direction: column; gap: 1.5rem; align-items: center; text-align: center; }
          .btn { flex: 1; padding: 0.75rem; font-size: 0.8rem; }
        }
      `}</style>
    </div>
  );
};

export default App;
