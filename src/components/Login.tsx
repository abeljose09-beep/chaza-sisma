import React, { useState } from 'react';
import { auth, db } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { LogIn, UserPlus, LogOut } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Login: React.FC = () => {
  const { user } = useStore();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError('Error al iniciar sesión: ' + err.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', res.user.uid), {
        name,
        email,
        role: 'client',
        debt: 0
      });
    } catch (err: any) {
      setError('Error al registrarse: ' + err.message);
    }
  };

  if (user) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
        <div>
          <p style={{ fontWeight: 'bold' }}>{user.name}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}> 
            Rol: {user.role === 'superuser' ? 'ADMIN' : user.role.toUpperCase()}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => signOut(auth)}>
          <LogOut size={18} /> Salir
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto' }} className="animate-fade-in">
      <div className="card">
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
        </h2>
        
        <form onSubmit={isRegistering ? handleRegister : handleLogin}>
          {isRegistering && (
            <div style={{ marginBottom: '1rem' }}>
              <label>Nombre</label>
              <input value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div style={{ marginBottom: '1rem' }}>
            <label>Correo Electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            {isRegistering ? <><UserPlus size={18} /> Registrarse</> : <><LogIn size={18} /> Entrar</>}
          </button>
        </form>

        <button 
          className="btn btn-ghost" 
          style={{ width: '100%', marginTop: '1rem' }}
          onClick={() => setIsRegistering(!isRegistering)}
        >
          {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </button>
      </div>
    </div>
  );
};
