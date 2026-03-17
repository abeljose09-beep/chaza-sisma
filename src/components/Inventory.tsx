import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useFirebase } from '../hooks/useFirebase';
import { Plus, Edit2, Search, Camera, X, Trash2 } from 'lucide-react';

export const Inventory: React.FC = () => {
  const { products, user } = useStore();
  const { addProduct, updateProduct, deleteProduct } = useFirebase();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    price: 0, 
    cost: 0,
    stock: 0, 
    category: '', 
    imageUrl: '' 
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'superuser';

  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("No se pudo acceder a la cámara");
      setIsCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setFormData({ ...formData, imageUrl: dataUrl });
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCapturing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateProduct(editingId, formData);
      setEditingId(null);
    } else {
      await addProduct(formData);
    }
    setFormData({ name: '', price: 0, cost: 0, stock: 0, category: '', imageUrl: '' });
    nameInputRef.current?.focus();
    if (editingId) setShowAdd(false);
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      price: product.price,
      cost: product.cost || 0,
      stock: product.stock,
      category: product.category || '',
      imageUrl: product.imageUrl || ''
    });
    setShowAdd(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Eliminar ${name}?`)) {
      await deleteProduct(id);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="inventory-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h2>Inventario</h2>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => {
            setEditingId(null);
            setFormData({ name: '', price: 0, cost: 0, stock: 0, category: '', imageUrl: '' });
            setShowAdd(!showAdd);
          }}>
            <Plus size={20} /> Nuevo Artículo
          </button>
        )}
      </div>

      {showAdd && isAdmin && (
        <form className="card animate-fade-in" onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
          <h3>{editingId ? 'Editar Artículo' : 'Nuevo Artículo'}</h3>
          <div className="grid" style={{ marginTop: '1rem' }}>
            <div>
              <label>Nombre del Artículo</label>
              <input 
                ref={nameInputRef}
                required 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label>Precio de Venta</label>
              <input 
                type="number" 
                required 
                value={formData.price} 
                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
              />
            </div>
            <div>
              <label>Costo de Compra (Inversión)</label>
              <input 
                type="number" 
                required 
                value={formData.cost} 
                onChange={e => setFormData({...formData, cost: Number(e.target.value)})}
              />
            </div>
            <div>
              <label>Cantidad Inicial / Stock</label>
              <input 
                type="number" 
                required 
                value={formData.stock} 
                onChange={e => setFormData({...formData, stock: Number(e.target.value)})}
              />
            </div>
          </div>
          
          <div style={{ marginTop: '1rem' }}>
            <label>Foto del Producto</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
              {formData.imageUrl ? (
                <div style={{ position: 'relative' }}>
                  <img src={formData.imageUrl} alt="preview" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                  <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer' }}><X size={14} /></button>
                </div>
              ) : (
                <button type="button" className="btn btn-ghost" onClick={startCamera}>
                  <Camera size={20} /> Tomar Foto
                </button>
              )}
            </div>
          </div>

          {isCapturing && (
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxWidth: '300px', borderRadius: '12px' }} />
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button type="button" className="btn btn-primary" onClick={capturePhoto}>Capturar</button>
                <button type="button" className="btn btn-ghost" onClick={stopCamera}>Cancelar</button>
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Actualizar' : 'Guardar Producto'}
            </button>
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

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {filteredProducts.map(p => (
            <div key={p.id} className="card" style={{ padding: '1rem' }}>
              {p.imageUrl && (
                <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '120px', borderRadius: '8px', objectFit: 'cover', marginBottom: '0.75rem' }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>{p.name}</h4>
                <span className={`badge ${p.stock < 5 ? 'danger' : 'success'}`} style={{ 
                  backgroundColor: p.stock < 5 ? '#fee2e2' : '#dcfce7',
                  color: p.stock < 5 ? '#ef4444' : '#10b981'
                }}>
                  {p.stock} uds
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Venta: ${p.price.toLocaleString()}</p>
                {isAdmin && p.cost > 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}>
                    Costo: ${p.cost.toLocaleString()}
                  </p>
                )}
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
                  <button className="btn btn-ghost" style={{ flex: 1, padding: '0.25rem' }} onClick={() => handleEdit(p)}>
                    <Edit2 size={16} /> Editar
                  </button>
                  <button className="btn btn-ghost" style={{ color: 'var(--danger)', padding: '0.25rem' }} onClick={() => handleDelete(p.id, p.name)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
