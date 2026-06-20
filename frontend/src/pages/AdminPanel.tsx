// ==============================================================================
// ADMIN PANEL VIEW (Panel Administratora)
// ==============================================================================
// Widok administracyjny zabezpieczony strażnikiem ról (RoleGuard - ADMIN).
// Posiada interfejs kart (Tabs) dzielący panel na zarządzanie zespołem (zmiana ról),
// pełne logi systemowe (Activity Logs) oraz statystyki ról i artykułów.

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { User, Role, ActivityLog, DashboardStats } from '../types';
import { 
  Users, 
  Terminal, 
  PieChart as ChartIcon,
  RefreshCw
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { addToast } = useNotifications();
  
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'stats'>('users');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Pobieramy dane równolegle
      const [usersRes, statsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/stats')
      ]);
      
      setUsers(usersRes.data.users);
      setStats(statsRes.data.stats);
      setLogs(statsRes.data.stats.recentLogs);
    } catch (error) {
      console.error('Błąd pobierania danych admina:', error);
      addToast('Błąd', 'Nie udało się załadować danych panelu administratora.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    document.title = "Panel Administratora | Wmedia Redakcja";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Zarządzaj zespołem redakcyjnym, uprawnieniami, rolami oraz logami systemowymi Wmedia.');
    } else {
      const meta = document.createElement('meta');
      meta.name = "description";
      meta.content = "Zarządzaj zespołem redakcyjnym, uprawnieniami, rolami oraz logami systemowymi Wmedia.";
      document.head.appendChild(meta);
    }
  }, []);

  // Zmiana roli użytkownika w bazie danych
  const handleRoleChange = async (userId: number, newRole: Role) => {
    setActionLoading(userId);
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      addToast('Zaktualizowano', `Pomyślnie zmieniono rolę użytkownika na: ${newRole}`, 'success');
      // Odświeżamy dane po zmianie roli
      fetchData();
    } catch (error: any) {
      addToast('Błąd', error.response?.data?.message || 'Nie udało się zmienić roli.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const polishRoleLabels: Record<Role, string> = {
    [Role.ADMIN]: 'Administrator',
    [Role.EDITOR]: 'Redaktor Naczelny',
    [Role.REVIEWER]: 'Recenzent/Korektor',
    [Role.AUTHOR]: 'Autor/Dziennikarz'
  };

  if (loading && users.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: '#9ca3af' }}>
        Ładowanie danych panelu administratora...
      </div>
    );
  }

  return (
    <div className="animate-slide-in">
      {/* Nagłówek panelu */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginBottom: '8px', color: 'var(--text-primary)' }}>
            Panel Administratora
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500 }}>
            Zarządzaj uprawnieniami zespołu, analizuj audyt logów i statystyki redakcji
          </p>
        </div>
        <button 
          onClick={fetchData}
          className="btn btn-secondary"
          style={{ padding: '10px 14px' }}
        >
          <RefreshCw size={16} /> Odśwież dane
        </button>
      </div>

      {/* ------------------------------------------------------------------------
         KARTY NAWIGACYJNE PANELU (TABS)
         ------------------------------------------------------------------------ */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--border-light)',
        marginBottom: '28px',
        gap: '24px'
      }}>
        <button 
          onClick={() => setActiveTab('users')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'users' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'users' ? 'var(--color-primary)' : 'var(--text-secondary)',
            padding: '12px 6px',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            marginBottom: '-2px'
          }}
        >
          <Users size={18} /> Zarządzanie Zespołem
        </button>

        <button 
          onClick={() => setActiveTab('logs')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'logs' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'logs' ? 'var(--color-primary)' : 'var(--text-secondary)',
            padding: '12px 6px',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            marginBottom: '-2px'
          }}
        >
          <Terminal size={18} /> Logi Aktywności
        </button>

        <button 
          onClick={() => setActiveTab('stats')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'stats' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'stats' ? 'var(--color-primary)' : 'var(--text-secondary)',
            padding: '12px 6px',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            marginBottom: '-2px'
          }}
        >
          <ChartIcon size={18} /> Szczegółowe Statystyki
        </button>
      </div>

      {/* ------------------------------------------------------------------------
         TAB 1: ZARZĄDZANIE ZESPOŁEM (USERS ROLE MANAGEMENT)
         ------------------------------------------------------------------------ */}
      {activeTab === 'users' && (
        <div className="glass-panel animate-slide-in" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                <th style={{ padding: '16px 24px' }}>Użytkownik</th>
                <th style={{ padding: '16px 24px' }}>Rola w systemie</th>
                <th style={{ padding: '16px 24px' }}>Napisane teksty</th>
                <th style={{ padding: '16px 24px' }}>Zrecenzowane teksty</th>
                <th style={{ padding: '16px 24px' }}>Data rejestracji</th>
                <th style={{ padding: '16px 24px' }}>Modyfikacja roli</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr 
                    key={u.id}
                    style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: isSelf ? 'rgba(226, 0, 26, 0.02)' : 'transparent' }}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="avatar-initials" style={{
                          background: isSelf ? 'rgba(226, 0, 26, 0.08)' : 'var(--bg-tertiary)',
                          color: isSelf ? 'var(--color-primary)' : 'var(--text-primary)',
                          fontWeight: 800
                        }}>
                          {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {u.name} {isSelf && <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)', marginLeft: '6px', fontWeight: 800 }}>(To Ty)</span>}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className={`badge badge-${u.role.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
                        {polishRoleLabels[u.role]}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {u._count?.authoredArticles || 0}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {u._count?.reviewedArticles || 0}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {new Date(u.createdAt).toLocaleDateString('pl-PL')}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {/* Zapobiegamy zmianie własnej roli przez admina (blokada przed odebraniem sobie ADMINA) */}
                      <select
                        className="form-input form-select"
                        style={{ width: '180px', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 700 }}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        disabled={isSelf || actionLoading === u.id}
                      >
                        {Object.values(Role).map(role => (
                          <option key={role} value={role}>{polishRoleLabels[role]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------------------------------------------
         TAB 2: LOGI AKTYWNOŚCI (SYSTEM AUDIT LOGS)
         ------------------------------------------------------------------------ */}
      {activeTab === 'logs' && (
        <div className="glass-panel animate-slide-in" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={20} style={{ color: 'var(--color-primary)' }} /> Log systemowy (ostatnie 30 akcji)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {logs.map(log => (
              <div 
                key={log.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 'bold', marginRight: '12px', fontFamily: 'monospace' }}>
                    [{log.action}]
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{log.details}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', display: 'flex', gap: '12px', fontSize: '0.8rem', fontWeight: 500 }}>
                  <span>Użytkownik: {log.user ? log.user.email : 'System'}</span>
                  <span>|</span>
                  <span>{new Date(log.createdAt).toLocaleString('pl-PL')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------
         TAB 3: STATYSTYKI SZCZEGÓŁOWE (ROLE & ARTICLES DATA GRID)
         ------------------------------------------------------------------------ */}
      {activeTab === 'stats' && stats && (
        <div className="stats-grid animate-slide-in">
          {/* Użytkownicy według ról */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
              Użytkownicy w podziale na role
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.usersByRole.map(item => (
                <div 
                  key={item.role} 
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.9rem' }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{polishRoleLabels[item.role]}</span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{item._count._all} kont(a)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Artykuły według statusów */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
              Artykuły w podziale na statusy
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.articlesByStatus.map(item => (
                <div 
                  key={item.status} 
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.9rem' }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.status}</span>
                  <span style={{ color: '#059669', fontWeight: 'bold' }}>{item._count._all} tekst(y)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Liderzy treści */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
              Najbardziej aktywni Autorzy
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.topAuthors.map(author => (
                <div 
                  key={author.id} 
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.9rem' }}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{author.name}</span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{author.email}</div>
                  </div>
                  <span style={{ color: '#a855f7', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                    {author._count.authoredArticles} tekst(ów)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminPanel;
