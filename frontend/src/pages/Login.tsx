// ==============================================================================
// LOGIN VIEW (Widok Logowania)
// ==============================================================================
// Estetyczny formularz logowania z efektami świecenia (glow), walidacją
// pól na bieżąco oraz animacją pojawiania się (slide-in).

import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, KeyRound, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Pobieramy ścieżkę, na którą użytkownik próbował wejść przed przekierowaniem
  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      // Przekierowujemy na bezpieczną ścieżkę po zalogowaniu
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Niepoprawny e-mail lub hasło.');
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
        left: '-100px',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(15,23,42,0.04) 0%, rgba(0,0,0,0) 70%)',
        bottom: '-150px',
        right: '-150px',
        pointerEvents: 'none'
      }} />

      {/* Kontener formularza logowania */}
      <div className="glass-panel animate-slide-in pulse-glow" style={{
        maxWidth: '440px',
        width: '100%',
        padding: '40px',
        zIndex: 5,
        backgroundColor: '#ffffff',
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
            Wmedia Redakcja
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', fontWeight: 600 }}>
            Zaloguj się do panelu wydawniczego portalu
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
          {/* Email */}
          <div className="form-group">
            <label className="form-label">E-mail deweloperski</label>
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
                placeholder="redakcja@wmedia.pl"
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
                placeholder="••••••••"
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

          {/* Przycisk logowania */}
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
                <LogIn size={18} /> Zaloguj się do redakcji
              </>
            )}
          </button>
        </form>

        {/* Link do rejestracji */}
        <div style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Nie masz jeszcze konta?{' '}
          <Link to="/register" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
            Zarejestruj się teraz
          </Link>
        </div>
        
        {/* Dane logowania do szybkiego testu */}
        <div style={{
          marginTop: '30px',
          padding: '16px',
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px dashed var(--border-light)',
          borderRadius: '8px',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: '6px' }}>Konta testowe (Hasło: password123):</div>
          • Autor: <code style={{color: 'var(--text-primary)', fontWeight: 'bold'}}>author@wmedia.pl</code><br/>
          • Recenzent: <code style={{color: 'var(--text-primary)', fontWeight: 'bold'}}>reviewer@wmedia.pl</code><br/>
          • Redaktor: <code style={{color: 'var(--text-primary)', fontWeight: 'bold'}}>editor@wmedia.pl</code><br/>
          • Admin: <code style={{color: 'var(--text-primary)', fontWeight: 'bold'}}>admin@wmedia.pl</code>
        </div>
      </div>
    </div>
  );
};
export default Login;
