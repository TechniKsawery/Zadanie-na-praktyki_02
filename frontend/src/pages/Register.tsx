// ==============================================================================
// REGISTER VIEW (Widok Rejestracji)
// ==============================================================================
// Rejestracja nowego użytkownika w systemie z domyślną rolą Autora.
// Posiada te same efekty premium i portalowe dopasowanie co strona logowania.

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, KeyRound, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    document.title = "Rejestracja | Wmedia Redakcja";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Utwórz konto autora w systemie automatyzacji redakcji Wmedia i zacznij pisać artykuły.');
    } else {
      const meta = document.createElement('meta');
      meta.name = "description";
      meta.content = "Utwórz konto autora w systemie automatyzacji redakcji Wmedia i zacznij pisać artykuły.";
      document.head.appendChild(meta);
    }
  }, []);

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
      backgroundColor: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Tła z gradientem (Glow w tle) */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(226,0,26,0.06) 0%, rgba(0,0,0,0) 70%)',
        top: '-100px',
        right: '-100px',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(15,23,42,0.04) 0%, rgba(0,0,0,0) 70%)',
        bottom: '-150px',
        left: '-150px',
        pointerEvents: 'none'
      }} />

      {/* Kontener formularza rejestracji */}
      <div className="glass-panel animate-slide-in pulse-glow" style={{
        maxWidth: '440px',
        width: '100%',
        padding: '40px',
        zIndex: 5,
        backgroundColor: 'var(--bg-secondary)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Nagłówek */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '2.2rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--color-primary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            Dołącz do redakcji
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', fontWeight: 600 }}>
            Utwórz konto w portalu i zacznij pisać teksty
          </p>
        </div>

        {/* Wyświetlanie błędu */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(220, 38, 38, 0.06)',
            border: '1px solid rgba(220, 38, 38, 0.15)',
            padding: '12px 16px',
            borderRadius: '8px',
            color: '#b91c1c',
            fontSize: '0.85rem',
            marginBottom: '20px',
            fontWeight: 600
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
                color: 'var(--text-secondary)'
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
            <label className="form-label">Adres e-mail</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)'
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
            <label className="form-label">Hasło dostępowe</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={18} style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)'
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="form-input"
                placeholder="min. 6 znaków"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '48px', paddingRight: '48px' }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
                title={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Przycisk rejestracji */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginBottom: '24px', fontSize: '0.95rem' }}
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
                <UserPlus size={18} /> Utwórz konto autora
              </>
            )}
          </button>
        </form>

        {/* Link do logowania */}
        <div style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Masz już konto?{' '}
          <Link to="/login" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
            Zaloguj się
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
