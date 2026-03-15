import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useFirebase } from '../hooks/useFirebase';
import { Plus, Edit2, Search } from 'lucide-react';

export const Inventory: React.FC = () => {
  const { products } = useStore();
  const { addProduct } = useFirebase();
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, stock: 0, category: '' });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addProduct(newProduct);
    setNewProduct({ name: '', price: 0, stock: 0, category: '' });
    setShowAdd(false);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="inventory-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h2>Gestión de Inventario</h2>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={20} /> Nuevo Artículo
        </button>
      </div>

      {showAdd && (
        <form className="card animate-fade-in" onSubmit={handleAdd} style={{ marginBottom: '2rem' }}>
          <div className="grid">
            <div>
              <label>Nombre del Artículo</label>
              <input 
                required 
                value={newProduct.name} 
                onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                placeholder="Ej: Empanada"
              />
            </div>
            <div>
              <label>Precio Unitario</label>
              <input 
                type="number" 
                required 
                value={newProduct.price} 
                onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
              />
            </div>
            <div>
              <label>Cantidad Inicial</label>
              <input 
                type="number" 
                required 
                value={newProduct.stock} 
                onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})}
              />
            </div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary">Guardar</button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="card">
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            style={{ paddingLeft: '2.5rem' }} 
            placeholder="Buscar artículos..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '1rem' }}>Producto</th>
                <th style={{ padding: '1rem' }}>Precio</th>
                <th style={{ padding: '1rem' }}>Stock</th>
                <th style={{ padding: '1rem' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }}>{p.name}</td>
                  <td style={{ padding: '1rem' }}>${p.price.toLocaleString()}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${p.stock < 5 ? 'danger' : 'success'}`} style={{ 
                      backgroundColor: p.stock < 5 ? '#fee2e2' : '#dcfce7',
                      color: p.stock < 5 ? '#ef4444' : '#10b981'
                    }}>
                      {p.stock} uds
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button className="btn btn-ghost" style={{ padding: '0.5rem' }}><Edit2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
