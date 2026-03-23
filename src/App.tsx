import React, { useState, useEffect } from 'react';
import { Users, Package, ShoppingCart, Receipt, TrendingUp, Sun, Moon, Trophy } from 'lucide-react';
import { Inventory } from './components/Inventory';
import { Clients } from './components/Clients';
import { POS } from './components/POS';
import { Orders } from './components/Orders';
import { Login } from './components/Login';
import { Reports } from './components/Reports';
import { WeeklyRanking } from './components/WeeklyRanking';
import { useStore } from './store/useStore';
import { useFirebase } from './hooks/useFirebase';
import './styles/main.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'clients' | 'orders' | 'reports' | 'ranking'>('pos');
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );
  const { user } = useStore();
  
  useFirebase();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  if (!user) {
    return (
      <div className="app-container">
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 10 }}>
          <button className="btn btn-ghost" onClick={toggleTheme} style={{ padding: '0.5rem', borderRadius: '50%' }}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: '4rem', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--primary)', margin: 0, letterSpacing: '-1px' }}>Sisma Chaza</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Mini Tienda de Pedidos</p>
        </div>
        <Login />
      </div>
    );
  }

  const isAtLeastAdmin = user.role === 'admin' || user.role === 'superuser';

  const tabs = [
    { id: 'pos' as const, icon: ShoppingCart, label: 'Comprar' },
    { id: 'inventory' as const, icon: Package, label: 'Inventario' },
    { id: 'orders' as const, icon: Receipt, label: isAtLeastAdmin ? 'Cuentas' : 'Mis Cuentas' },
    { id: 'ranking' as const, icon: Trophy, label: 'Ranking' },
    ...(isAtLeastAdmin ? [
      { id: 'clients' as const, icon: Users, label: 'Clientes' },
      { id: 'reports' as const, icon: TrendingUp, label: 'Informes' },
    ] : []),
  ];

  return (
    <div className="app-shell">
      {/* Top Bar */}
      <header className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo.png" alt="Logo Sisma Chaza" style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '6px' }} />
          <h1 className="brand-name">Sisma Chaza</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn-icon" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <Login />
        </div>
      </header>

      {/* Desktop Nav (hidden on mobile) */}
      <nav className="desktop-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="main-content animate-fade-in">
        {activeTab === 'pos' && <POS />}
        {activeTab === 'inventory' && <Inventory />}
        {activeTab === 'clients' && <Clients />}
        {activeTab === 'orders' && <Orders />}
        {activeTab === 'reports' && <Reports />}
        {activeTab === 'ranking' && <WeeklyRanking />}
      </main>

      {/* Bottom Tab Bar (mobile only) */}
      <nav className="bottom-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`bottom-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={20} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
