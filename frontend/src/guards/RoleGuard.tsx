// ==============================================================================
// ROLE AUTHORIZATION GUARD (Ochrona Tras Rolami)
// ==============================================================================
// Ten komponent ogranicza dostęp do danej ścieżki w zależności od roli użytkownika.
// Jeśli zalogowany użytkownik ma niewystarczające uprawnienia, wyświetla mu
// estetyczny komunikat błędu "Brak Uprawnień" zamiast pustej strony.

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  // Sprawdzamy czy użytkownik posiada uprawnienia
  const hasAccess = user && allowedRoles.includes(user.role);

  if (!hasAccess) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: '20px'
      }}>
        {/* Szklana karta odmowy dostępu */}
        <div className="glass-panel animate-slide-in" style={{
          maxWidth: '500px',
          width: '100%',
          padding: '40px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px'
        }}>
          {/* Ikona ostrzeżenia */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldAlert size={40} />
          </div>

          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'Outfit' }}>
            Brak Uprawnień
          </h2>

          <p style={{ color: '#9ca3af', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Twój profil ma przypisaną rolę <strong style={{ color: '#fff' }}>{user?.role}</strong>. 
            Ta strona jest dostępna wyłącznie dla ról: 
            <span style={{ display: 'block', marginTop: '6px', color: '#6366f1', fontWeight: 600 }}>
              {allowedRoles.join(', ')}
            </span>
          </p>

          <Link to="/" className="btn btn-primary" style={{ width: '100%' }}>
            <ArrowLeft size={18} /> Powrót do pulpitu
          </Link>
        </div>
      </div>
    );
  }

  // Jeśli użytkownik ma uprawnienia, renderujemy trasę
  return <>{children}</>;
};

export default RoleGuard;
