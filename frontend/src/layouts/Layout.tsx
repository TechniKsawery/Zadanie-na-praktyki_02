// ==============================================================================
// LAYOUT COMPONENT (Główny Layout Aplikacji)
// ==============================================================================
// Ten komponent owija wszystkie podstrony dla zalogowanych użytkowników.
// Odpowiada za wyświetlanie bocznego paska nawigacyjnego (Sidebar),
// górnego paska z powiadomieniami (Header) oraz kontenera wyskakujących Toastów.

import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications, Toast } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { Role } from '../types';
import { 
  LayoutDashboard, 
  FileText, 
  Calendar, 
  Settings, 
  LogOut, 
  Bell, 
  Check, 
  X, 
  BookOpen,
  Sun,
  Moon
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, toasts, removeToast, markAsRead, markAllAsRead } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app-container">
      {/* ------------------------------------------------------------------------
         PASEK BOCZNY (SIDEBAR)
         ------------------------------------------------------------------------ */}
      <aside className="app-sidebar">
        <div className="sidebar-logo">
          <BookOpen size={24} style={{ color: '#6366f1' }} />
          <span>wmedia redakcja</span>
        </div>

        <nav style={{ flex: 1 }}>
          <ul className="sidebar-menu">
            <li>
              <Link to="/" className={`menu-item ${isActive('/') ? 'active' : ''}`}>
                <LayoutDashboard size={20} />
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/articles" className={`menu-item ${isActive('/articles') ? 'active' : ''}`}>
                <FileText size={20} />
                Artykuły
              </Link>
            </li>
            <li>
              <Link to="/calendar" className={`menu-item ${isActive('/calendar') ? 'active' : ''}`}>
                <Calendar size={20} />
                Kalendarz
              </Link>
            </li>
            {/* Ograniczenie widoczności panelu Admina wyłącznie do roli ADMIN */}
            {user?.role === Role.ADMIN && (
              <li>
                <Link to="/admin" className={`menu-item ${isActive('/admin') ? 'active' : ''}`}>
                  <Settings size={20} />
                  Panel Admina
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* Stopka sidebaru z profilem i logoutem */}
        {/* Stopka sidebaru z profilem i logoutem */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-info">
            <div className="sidebar-avatar">
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: 'var(--text-primary)' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                {user ? (user.role === Role.ADMIN ? 'Admin' : user.role === Role.EDITOR ? 'Redaktor' : user.role === Role.REVIEWER ? 'Recenzent' : 'Autor') : ''}
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
            title="Wyloguj się"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* ------------------------------------------------------------------------
         GŁÓWNY OBSZAR STRONY (CONTENT)
         ------------------------------------------------------------------------ */}
      <div className="app-content">
        {/* Górny Header */}
        <header className="glass-header" style={{
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {/* Metryki i status połączenia */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{
              backgroundColor: 'rgba(226, 0, 26, 0.08)',
              color: 'var(--color-primary)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}>
              Wmedia Sport • Wydawca
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
              Live Sync
            </span>
          </div>

          {/* Kontrolki po prawej: Motyw i Powiadomienia */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={toggleTheme}
              title={theme === 'light' ? 'Przełącz na ciemny motyw' : 'Przełącz na jasny motyw'}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-light)',
                borderRadius: '50%',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-light)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Przycisk powiadomień */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '50%',
                  width: '42px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: showNotifications ? 'var(--color-primary)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-light)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
              >
                <Bell size={20} />
              
              {/* Czerwona kropka nieprzeczytanych powiadomień */}
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '0px',
                  right: '0px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  minWidth: '18px',
                  height: '18px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px',
                  border: '2px solid var(--bg-secondary)'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Panel Dropdown z Powiadomieniami */}
            {showNotifications && (
              <div className="glass-panel" style={{
                position: 'absolute',
                right: 0,
                top: '52px',
                width: '360px',
                maxHeight: '450px',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 200,
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Powiadomienia</h4>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => markAllAsRead()}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Check size={14} /> Przeczytaj wszystkie
                    </button>
                  )}
                </div>

                {/* Lista powiadomień */}
                <div style={{
                  overflowY: 'auto',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {notifications.length === 0 ? (
                    <div style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      color: 'var(--text-secondary)',
                      fontSize: '0.85rem'
                    }}>
                      Brak powiadomień do wyświetlenia.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        style={{
                          padding: '16px',
                          borderBottom: '1px solid var(--border-light)',
                          backgroundColor: notif.isRead ? 'transparent' : 'rgba(226, 0, 26, 0.02)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          position: 'relative',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '10px'
                        }}>
                          <span style={{ 
                            fontSize: '0.88rem', 
                            fontWeight: notif.isRead ? 600 : 800, 
                            color: notif.isRead ? 'var(--text-secondary)' : 'var(--text-primary)' 
                          }}>
                            {notif.title}
                          </span>
                          {!notif.isRead && (
                            <button 
                              onClick={() => markAsRead(notif.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '2px',
                                borderRadius: '4px'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#10b981'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                              title="Oznacz jako przeczytane"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                          {notif.message}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>
                          {new Date(notif.createdAt).toLocaleString('pl-PL')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

        {/* Widoki podstron */}
        <main className="main-view">
          <Outlet />
        </main>
      </div>

      {/* ------------------------------------------------------------------------
         KOLEJKA FLOATING TOASTS (BOTTOM-RIGHT ALERTS)
         ------------------------------------------------------------------------ */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 9999,
        maxWidth: '350px',
        width: '100%',
        pointerEvents: 'none'
      }}>
        {toasts.map((toast: Toast) => (
          <div 
            key={toast.id}
            className="glass-panel"
            style={{
              padding: '16px 20px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              pointerEvents: 'auto',
              boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
              borderLeft: toast.type === 'success' ? '4px solid #10b981' : 
                          toast.type === 'warning' ? '4px solid #f59e0b' : 
                          toast.type === 'error' ? '4px solid #ef4444' : '4px solid #6366f1',
              animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', marginBottom: '3px' }}>
                {toast.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', lineHeight: '1.3' }}>
                {toast.message}
              </div>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                marginTop: '2px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
export default Layout;
