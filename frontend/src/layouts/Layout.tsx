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
  User as UserIcon,
  BookOpen
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, toasts, removeToast, markAsRead, markAllAsRead } = useNotifications();
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
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6366f1',
              flexShrink: 0
            }}>
              <UserIcon size={18} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 500 }}>
                {user?.role}
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
          justifyContent: 'flex-end',
          padding: '0 32px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
        }}>
          {/* Przycisk powiadomień */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-light)',
                borderRadius: '50%',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: showNotifications ? '#6366f1' : '#f3f4f6',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
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
                  border: '2px solid #0a0a0f'
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
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Powiadomienia</h4>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => markAllAsRead()}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6366f1',
                        fontSize: '0.78rem',
                        fontWeight: 600,
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
                      color: '#6b7280',
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
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          backgroundColor: notif.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.03)',
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
                            fontWeight: notif.isRead ? 500 : 700, 
                            color: notif.isRead ? '#d1d5db' : '#fff' 
                          }}>
                            {notif.title}
                          </span>
                          {!notif.isRead && (
                            <button 
                              onClick={() => markAsRead(notif.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#6b7280',
                                cursor: 'pointer',
                                padding: '2px',
                                borderRadius: '4px'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#10b981'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                              title="Oznacz jako przeczytane"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#9ca3af', lineHeight: '1.4' }}>
                          {notif.message}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '4px' }}>
                          {new Date(notif.createdAt).toLocaleString('pl-PL')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
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
