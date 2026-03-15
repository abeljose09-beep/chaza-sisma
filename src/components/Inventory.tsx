import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useFirebase } from '../hooks/useFirebase';
import { Plus, Edit2, Search, Camera, X } from 'lucide-react';

export const Inventory: React.FC = () => {
  const { products, user } = useStore();
  const { addProduct } = useFirebase();
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    price: 0, 
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
        setNewProduct({ ...newProduct, imageUrl: dataUrl });
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addProduct(newProduct);
    setNewProduct({ name: '', price: 0, stock: 0, category: '', imageUrl: '' });
    setShowAdd(false);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="inventory-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h2>Inventario</h2>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={20} /> Nuevo Artículo
          </button>
        )}
      </div>

      {showAdd && isAdmin && (
        <form className="card animate-fade-in" onSubmit={handleAdd} style={{ marginBottom: '2rem' }}>
          <div className="grid">
            <div>
              <label>Nombre del Artículo</label>
              <input 
                required 
                value={newProduct.name} 
                onChange={e => setNewProduct({...newProduct, name: e.target.value})}
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
          
          <div style={{ marginTop: '1rem' }}>
            <label>Foto del Producto</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
              {newProduct.imageUrl ? (
                <div style={{ position: 'relative' }}>
                  <img src={newProduct.imageUrl} alt="preview" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                  <button type="button" onClick={() => setNewProduct({...newProduct, imageUrl: ''})} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer' }}><X size={14} /></button>
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
            <button type="submit" className="btn btn-primary">Guardar Producto</button>
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
                <span className="badge" style={{ backgroundColor: '#dcfce7', color: '#10b981' }}>{p.stock} uds</span>
              </div>
              <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>${p.price.toLocaleString()}</p>
              {isAdmin && (
                <button className="btn btn-ghost" style={{ width: '100%', marginTop: '0.5rem', padding: '0.25rem' }}>
                  <Edit2 size={16} /> Editar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
