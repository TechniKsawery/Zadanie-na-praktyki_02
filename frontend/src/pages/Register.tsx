// ==============================================================================
// REGISTER VIEW (Widok Rejestracji)
// ==============================================================================
// Rejestracja nowego użytkownika w systemie z domyślną rolą Autora.
// Posiada te same efekty premium (glassmorphism i glow) co strona logowania.

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, KeyRound, User, AlertCircle } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 6) {
      setError('Hasło musi składać się z co najmniej 6 znaków.');
      setLoading(false);
      return;
    }

    try {
      await register(email, password, name);
      // Przekierowujemy do panelu głównego po udanej rejestracji
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd podczas tworzenia konta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: '#050508',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Tła z gradientem (Glow w tle) */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, rgba(0,0,0,0) 70%)',
        top: '-100px',
        right: '-100px',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(0,0,0,0) 70%)',
        bottom: '-150px',
        left: '-150px',
        pointerEvents: 'none'
      }} />

      {/* Kontener formularza rejestracji */}
      <div className="glass-panel animate-slide-in pulse-glow" style={{
        maxWidth: '440px',
        width: '100%',
        padding: '40px',
        zIndex: 5
      }}>
        {/* Nagłówek */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '2rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #fff 40%, #c084fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            Utwórz konto
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
            Dołącz do redakcji i zacznij pisać teksty
          </p>
        </div>

        {/* Wyświetlanie błędu */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '12px 16px',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '0.85rem',
            marginBottom: '20px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Imię i Nazwisko */}
          <div className="form-group">
            <label className="form-label">Nazwa użytkownika / Imię</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6b7280'
              }} />
              <input
                type="text"
                required
                className="form-input"
                placeholder="Jan Kowalski"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ paddingLeft: '48px' }}
                disabled={loading}
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6b7280'
              }} />
              <input
                type="email"
                required
                className="form-input"
                placeholder="kowalski@wmedia.pl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '48px' }}
                disabled={loading}
              />
            </div>
          </div>

          {/* Hasło */}
          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label">Hasło</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={18} style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6b7280'
              }} />
              <input
                type="password"
                required
                className="form-input"
                placeholder="min. 6 znaków"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '48px' }}
                disabled={loading}
              />
            </div>
          </div>

          {/* Przycisk rejestracji */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginBottom: '24px' }}
            disabled={loading}
          >
            {loading ? (
              <div style={{
                width: '18px',
                height: '18px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite'
              }} />
            ) : (
              <>
                <UserPlus size={18} /> Zarejestruj się
              </>
            )}
          </button>
        </form>

        {/* Link do logowania */}
        <div style={{ textAlign: 'center', fontSize: '0.88rem', color: '#9ca3af' }}>
          Masz już konto?{' '}
          <Link to="/login" style={{ fontWeight: 600, color: '#a855f7' }}>
            Zaloguj się
          </Link>
        </div>
      </div>
    </div>
  );
};
export default Register;
