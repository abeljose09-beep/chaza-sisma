import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useEffect } from 'react';
import { useFirebase } from '../hooks/useFirebase';
import { Search, Plus, Minus, ShoppingBag, ShoppingCart } from 'lucide-react';

export const POS: React.FC = () => {
  const { products, clients, activeCart, addToCart, removeFromCart, clearCart, selectedClientId, setSelectedClient, user } = useStore();
  const { addOrder } = useFirebase();
  const [searchTerm, setSearchTerm] = useState('');

  const isClient = user?.role === 'client';

  useEffect(() => {
    if (isClient && user) {
      setSelectedClient(user.uid);
    }
  }, [isClient, user, setSelectedClient]);

  const cartTotal = activeCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (!selectedClientId) return alert("Selecciona un cliente");
    if (activeCart.length === 0) return;

    try {
      // Create the order/purchase (Transaction now handles stock and debt)
      await addOrder({
        clientId: selectedClientId,
        items: activeCart,
        total: cartTotal,
        status: 'pending'
      });

      clearCart();
      alert("Pedido registrado exitosamente");
    } catch (error: any) {
      console.error(error);
      alert("Error al procesar el pedido: " + error.message);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) && p.stock > 0
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }} className="pos-container">
      <div className="product-selection">
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
             <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem' }}>Cliente</label>
                {isClient ? (
                  <div style={{ padding: '0.75rem', background: 'var(--background)', borderRadius: 'var(--radius)', marginTop: '0.25rem', fontWeight: 'bold' }}>
                    {user?.name} (Tú)
                  </div>
                ) : (
                  <select 
                    value={selectedClientId || ''} 
                    onChange={e => setSelectedClient(e.target.value)}
                    style={{ marginTop: '0.25rem' }}
                  >
                    <option value="">Seleccionar Cliente...</option>
                    {clients.map(c => (
                      <option key={c.uid} value={c.uid}>{c.name}</option>
                    ))}
                  </select>
                )}
             </div>
             <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem' }}>Buscar Producto</label>
                <div style={{ position: 'relative', marginTop: '0.25rem' }}>
                  <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    style={{ paddingLeft: '2.4rem' }} 
                    placeholder="Empanada, Jugo..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
             </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {filteredProducts.map(product => (
            <div key={product.id} className="card product-card" onClick={() => addToCart(product, 1)} style={{ cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ background: 'var(--primary)', color: 'white', borderRadius: '8px', padding: '1rem', marginBottom: '0.5rem' }}>
                <ShoppingBag size={24} style={{ margin: '0 auto' }} />
              </div>
              <p style={{ fontWeight: 'bold' }}>{product.name}</p>
              <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>${product.price.toLocaleString()}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stock: {product.stock}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="cart-sidebar">
        <div className="card" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', position: 'sticky', top: '1rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={20} /> Carrito de Compras
          </h3>
          
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
            {activeCart.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <div>
                  <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.name}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.quantity} x ${item.price.toLocaleString()}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => removeFromCart(item.id)}><Minus size={14} /></button>
                  <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => addToCart(item, 1)}><Plus size={14} /></button>
                </div>
              </div>
            ))}
            {activeCart.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <ShoppingCart size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p>El carrito está vacío</p>
              </div>
            )}
          </div>

          <div style={{ borderTop: '2px solid var(--border)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <p style={{ fontWeight: 'bold' }}>Total</p>
              <p style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--primary)' }}>${cartTotal.toLocaleString()}</p>
            </div>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem' }}
              disabled={activeCart.length === 0 || !selectedClientId}
              onClick={handleCheckout}
            >
              Confirmar Compra
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .pos-container { gap: 1rem; }
        @media (max-width: 900px) {
          .pos-container { grid-template-columns: 1fr !important; }
          .cart-sidebar { order: -1; }
          .card { height: auto !important; position: relative !important; top: 0 !important; }
        }
        @media (max-width: 768px) {
          .pos-container .grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)) !important; gap: 0.5rem !important; }
          .product-card { padding: 0.6rem !important; }
          .product-card p { font-size: 0.8rem !important; }
        }
      `}</style>
    </div>
  );
};
