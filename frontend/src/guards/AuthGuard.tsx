// ==============================================================================
// AUTHENTICATION GUARD (Ochrona Tras Uwierzytelnieniem)
// ==============================================================================
// Ten komponent zabezpiecza ścieżki wymagające zalogowania. Jeśli użytkownik
// nie jest uwierzytelniony, przekierowuje go do widoku logowania.
// Wyświetla również estetyczny ekran ładowania podczas sprawdzania JWT.

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Podczas weryfikacji sesji w tle wyświetlamy animację ładowania
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0a0a0f',
        color: '#f3f4f6',
        gap: '20px'
      }}>
        {/* Spinner czystym CSS */}
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(99, 102, 241, 0.1)',
          borderTop: '3px solid #6366f1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 500 }}>
          Trwa uwierzytelnianie...
        </h3>
        
        {/* Wstrzykujemy mały styl dla klucza spin */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  // Jeśli użytkownik jest niezalogowany, przekierowujemy do /login zapamiętując poprzednią ścieżkę
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Zwracamy komponenty podrzędne dla zalogowanego użytkownika
  return <>{children}</>;
};
export default AuthGuard;
